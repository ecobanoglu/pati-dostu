import { HttpStatus, Injectable } from "@nestjs/common"
import { auditLog, city, type Database, district, orgHours, organization, slugify, user } from "@pati-dostu/db"
import {
  ADMIN_APPLICATIONS_PAGE_SIZE,
  type AdminApplicationsQuery,
  normalizeTurkishPhone,
  type OrganizationApplicationData,
} from "@pati-dostu/validators"
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import type {
  AdminApplicationDetail,
  AdminApplicationPage,
  MyApplication,
  OrganizationApplication,
} from "./organizations.dto.js"

type SessionUser = AuthSession["user"]
type OrgRow = typeof organization.$inferSelect

/** ILIKE kalıbında `%` ve `_` düz karakter olsun. */
const likeEscape = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`)
/** Postgres `time` değeri "09:00:00" → "09:00". */
const hhmm = (t: string) => t.slice(0, 5)
// Alt sorgularda dış tablonun sütunu açıkça yazılır (Drizzle tek tablolu sorguda tablo adını atlayabilir).
const U_ID = sql.raw('"user"."id"')
const ORG_REVIEWED_BY = sql.raw('"organization"."reviewed_by"')

/**
 * Kurumsal başvuru (5. aşama 6. adım). Kullanıcı (rolü `user`, e-postası doğrulanmış) belgesiz başvuru gönderir;
 * hesap başına tek `organization` satırı vardır. Bekleyen başvuru varken yenisi gönderilemez; reddedilen başvuru
 * düzenlenip yeniden gönderilebilir (karar — aynı satır yeniden `pending` olur, önceki gerekçe admin'e görünür).
 * Admin onaylayınca durum `approved`, `verifiedAt` dolar ve kullanıcının rolü kurum türü olur (clinic / shelter);
 * reddedince gerekçe kaydedilir. Her iki sonuç kullanıcıya sabit kanallı bildirim + e-postayla gider.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly notifications: NotificationsService
  ) {}

  // --- Kullanıcı ----------------------------------------------------------------------------------------------

  /** Oturumdaki kullanıcının başvurusu (yoksa null) — form ön doldurma ve durum kartı için. */
  async mine(me: SessionUser): Promise<MyApplication> {
    const [row] = await this.db
      .select({ id: organization.id })
      .from(organization)
      .where(and(eq(organization.userId, me.id), isNull(organization.deletedAt)))
    return { application: row ? await this.application(row.id) : null }
  }

  /** Başvuru gönderir (ilk kez ya da reddedildikten sonra yeniden). */
  async apply(me: SessionUser, input: OrganizationApplicationData): Promise<MyApplication> {
    if (!me.emailVerified) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED, "E-posta adresiniz doğrulanmamış.")
    }
    if (me.role !== "user") {
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.ALREADY_ORGANIZATION, "Bu hesap başvuru yapamaz.")
    }
    const [d] = await this.db
      .select({ cityId: district.cityId })
      .from(district)
      .where(eq(district.id, input.districtId))
    if (!d || d.cityId !== input.cityId) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.DISTRICT_MISMATCH, "Geçersiz alan.", {
        field: "districtId",
      })
    }
    const [existing] = await this.db.select().from(organization).where(eq(organization.userId, me.id))
    if (existing && !existing.deletedAt) {
      if (existing.status === "pending") {
        throw new AppException(HttpStatus.CONFLICT, ErrorCode.APPLICATION_PENDING, "Bekleyen başvurunuz var.")
      }
      if (existing.status === "approved") {
        throw new AppException(HttpStatus.CONFLICT, ErrorCode.ALREADY_ORGANIZATION, "Başvurunuz zaten onaylı.")
      }
    }

    const values = {
      type: input.type,
      name: input.name.trim(),
      registryNo: input.registryNo.trim(),
      contactName: input.contactName.trim(),
      phone: normalizeTurkishPhone(input.phone),
      email: input.email.trim().toLowerCase(),
      cityId: input.cityId,
      districtId: input.districtId,
      address: input.address.trim(),
      services: [...new Set(input.services)],
      is24h: input.is24h,
      status: "pending" as const,
      reviewedBy: null,
      reviewedAt: null,
      verifiedAt: null,
      deletedAt: null,
      updatedAt: new Date(),
    }
    const hours = input.is24h ? [] : input.hours
    const id = await this.db.transaction(async (tx) => {
      let orgId: string
      if (existing) {
        // Ad değiştiyse slug da yenilenir (kurum henüz hiç yayında görünmedi).
        const slug = existing.name === values.name ? existing.slug : await this.uniqueSlug(values.name, existing.id)
        await tx
          .update(organization)
          .set({ ...values, slug })
          .where(eq(organization.id, existing.id))
        await tx.delete(orgHours).where(eq(orgHours.orgId, existing.id))
        orgId = existing.id
      } else {
        const [row] = await tx
          .insert(organization)
          .values({ ...values, userId: me.id, slug: await this.uniqueSlug(values.name) })
          .returning({ id: organization.id })
        orgId = row!.id
      }
      if (hours.length) {
        await tx.insert(orgHours).values(hours.map((h) => ({ orgId, ...h })))
      }
      return orgId
    })
    return { application: await this.application(id) }
  }

  // --- Admin --------------------------------------------------------------------------------------------------

  /** Liste: bekleyenler en eski gönderim önce, sonuçlananlar en yeni karar önce; sekme sayıları. */
  async list(q: AdminApplicationsQuery): Promise<AdminApplicationPage> {
    const alive = isNull(organization.deletedAt)
    const where = and(alive, eq(organization.status, q.status))
    const order =
      q.status === "pending" ? [asc(organization.updatedAt)] : [desc(organization.reviewedAt), desc(organization.id)]
    const [rows, counts] = await Promise.all([
      this.db
        .select({
          org: organization,
          city: city.name,
          district: district.name,
          applicant: { id: user.id, name: user.name, email: user.email },
        })
        .from(organization)
        .innerJoin(user, eq(user.id, organization.userId))
        .innerJoin(city, eq(city.id, organization.cityId))
        .leftJoin(district, eq(district.id, organization.districtId))
        .where(where)
        .orderBy(...order)
        .limit(ADMIN_APPLICATIONS_PAGE_SIZE)
        .offset((q.page - 1) * ADMIN_APPLICATIONS_PAGE_SIZE),
      this.db
        .select({ status: organization.status, value: count() })
        .from(organization)
        .where(alive)
        .groupBy(organization.status),
    ])
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c.value]))
    return {
      items: rows.map((r) => ({
        id: r.org.id,
        type: r.org.type,
        name: r.org.name,
        city: r.city,
        district: r.district,
        contactName: r.org.contactName,
        applicant: r.applicant,
        status: r.org.status,
        submittedAt: r.org.updatedAt.toISOString(),
        reviewedAt: r.org.reviewedAt?.toISOString() ?? null,
        resubmitted: r.org.status === "pending" && r.org.rejectionReason !== null,
      })),
      total: byStatus[q.status] ?? 0,
      page: q.page,
      pageSize: ADMIN_APPLICATIONS_PAGE_SIZE,
      counts: {
        pending: byStatus.pending ?? 0,
        approved: byStatus.approved ?? 0,
        rejected: byStatus.rejected ?? 0,
      },
    }
  }

  /** Ayrıntı: başvuru + başvuran (üyelik, ilan sayısı) + değerlendiren. */
  async detail(id: string): Promise<AdminApplicationDetail> {
    const app = await this.application(id)
    const [row] = await this.db
      .select({
        userId: organization.userId,
        reviewer: sql<string | null>`(select u.name from "user" u where u.id = ${ORG_REVIEWED_BY})`,
      })
      .from(organization)
      .where(eq(organization.id, id))
    const [applicant] = await this.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt,
        listings: sql<number>`(select count(*)::int from listing l where l.owner_id = ${U_ID} and l.deleted_at is null and l.status <> 'draft')`,
      })
      .from(user)
      .where(eq(user.id, row!.userId))
    return {
      ...app,
      applicant: { ...applicant!, role: applicant!.role ?? "user", createdAt: applicant!.createdAt.toISOString() },
      reviewer: row!.reviewer,
      resubmitted: app.status === "pending" && app.rejectionReason !== null,
    }
  }

  /** Onayla: kurum doğrulanır, kullanıcının rolü kurum türü olur; bildirim + denetim kaydı. */
  async approve(admin: SessionUser, id: string): Promise<void> {
    const org = await this.pending(id)
    const [owner] = await this.db
      .select({ role: user.role, deletedAt: user.deletedAt })
      .from(user)
      .where(eq(user.id, org.userId))
    if (!owner || owner.deletedAt) throw this.notFound()
    if (owner.role !== "user") {
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.ALREADY_ORGANIZATION, "Hesabın rolü üye değil.")
    }
    const now = new Date()
    await this.db.transaction(async (tx) => {
      await tx
        .update(organization)
        .set({ status: "approved", reviewedBy: admin.id, reviewedAt: now, verifiedAt: now, rejectionReason: null })
        .where(eq(organization.id, id))
      await tx.update(user).set({ role: org.type }).where(eq(user.id, org.userId))
    })
    await this.audit(admin.id, "organization.approve", id, { type: org.type, name: org.name })
    await this.notifications.notify(org.userId, { type: "org_application_approved", orgType: org.type, name: org.name })
  }

  /** Reddet: gerekçe kullanıcıya gider; kullanıcı düzenleyip yeniden gönderebilir. */
  async reject(admin: SessionUser, id: string, reason: string): Promise<void> {
    const org = await this.pending(id)
    await this.db
      .update(organization)
      .set({ status: "rejected", reviewedBy: admin.id, reviewedAt: new Date(), rejectionReason: reason.trim() })
      .where(eq(organization.id, id))
    await this.audit(admin.id, "organization.reject", id, { reason: reason.trim() })
    await this.notifications.notify(org.userId, {
      type: "org_application_rejected",
      orgType: org.type,
      name: org.name,
      reason: reason.trim(),
    })
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Başvuruyu şehir/ilçe adları ve çalışma saatleriyle okur. */
  private async application(id: string): Promise<OrganizationApplication> {
    const [row] = await this.db
      .select({ org: organization, city: city.name, district: district.name })
      .from(organization)
      .innerJoin(city, eq(city.id, organization.cityId))
      .leftJoin(district, eq(district.id, organization.districtId))
      .where(and(eq(organization.id, id), isNull(organization.deletedAt)))
    if (!row) throw this.notFound()
    const hours = await this.db
      .select({ weekday: orgHours.weekday, opensAt: orgHours.opensAt, closesAt: orgHours.closesAt })
      .from(orgHours)
      .where(eq(orgHours.orgId, id))
      .orderBy(asc(orgHours.weekday), asc(orgHours.opensAt))
    const o = row.org
    return {
      id: o.id,
      type: o.type,
      name: o.name,
      registryNo: o.registryNo,
      contactName: o.contactName,
      phone: o.phone,
      email: o.email,
      cityId: o.cityId,
      districtId: o.districtId,
      city: row.city,
      district: row.district,
      address: o.address,
      services: o.services,
      is24h: o.is24h,
      hours: hours.map((h) => ({ weekday: h.weekday, opensAt: hhmm(h.opensAt), closesAt: hhmm(h.closesAt) })),
      status: o.status,
      rejectionReason: o.rejectionReason,
      submittedAt: o.updatedAt.toISOString(),
      reviewedAt: o.reviewedAt?.toISOString() ?? null,
    }
  }

  /** Değerlendirilecek başvuru: var ve beklemede (değilse 404 / 409 `APPLICATION_NOT_PENDING`). */
  private async pending(id: string): Promise<OrgRow> {
    const [org] = await this.db
      .select()
      .from(organization)
      .where(and(eq(organization.id, id), isNull(organization.deletedAt)))
    if (!org) throw this.notFound()
    if (org.status !== "pending") {
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.APPLICATION_NOT_PENDING, "Başvuru beklemede değil.")
    }
    return org
  }

  /** Kurum adından benzersiz slug ("can-dostlar-veteriner-klinigi", çakışırsa "-2"…); ileride kurum sayfası adresi. */
  private async uniqueSlug(name: string, exceptId?: string): Promise<string> {
    const base = slugify(name).slice(0, 80).replace(/-+$/, "") || "kurum"
    const taken = await this.db
      .select({ id: organization.id, slug: organization.slug })
      .from(organization)
      .where(or(eq(organization.slug, base), ilike(organization.slug, `${likeEscape(base)}-%`)))
    const used = new Set(taken.filter((t) => t.id !== exceptId).map((t) => t.slug))
    if (!used.has(base)) return base
    for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`
  }

  /** Denetim kaydı. */
  private async audit(actorId: string, action: string, entityId: string, diff: object) {
    await this.db
      .insert(auditLog)
      .values({ actorId, action, entity: "organization", entityId, diff: diff as Record<string, unknown> })
  }

  /** 404. */
  private notFound() {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Başvuru bulunamadı.")
  }
}
