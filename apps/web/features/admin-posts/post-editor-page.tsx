import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { requireAdmin } from "@/lib/admin"
import { apiServer } from "@/lib/server-api"

import { PostEditor } from "./post-editor"
import type { AdminPostDetail, AdminPostOptions } from "./types"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı: "Blog / haber editörü". */
export async function postEditorMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminPosts")
  return { title: t("editorTitle") }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Editör sayfası (sunucu): yetki, editör seçenekleri (kategoriler, etiketler) ve düzenlenen yazı. Yeni yazıda
 * `?tur=haber` haber türüyle başlatır. Olmayan / silinmiş yazı → yumuşak 404. Oturum okuduğu için <Suspense> içinde.
 */
export async function PostEditorPage({
  params,
  searchParams,
}: {
  params?: Promise<{ id: string }>
  searchParams?: Promise<SearchParams>
}) {
  await requireAdmin()
  const locale = await getLocale()
  const id = params ? (await params).id : null
  if (id !== null && !UUID.test(id)) notFound()
  const sp = searchParams ? await searchParams : {}
  const [t, options, post] = await Promise.all([
    getTranslations("AdminPosts"),
    apiServer<AdminPostOptions>(`/admin/posts/options?locale=${locale}`),
    id ? apiServer<AdminPostDetail>(`/admin/posts/${id}`) : Promise.resolve(null),
  ])
  if (id && !post) notFound()
  if (!options) throw new Error("Editör seçenekleri okunamadı")

  const type = post?.type ?? (sp.tur === "haber" ? "news" : "blog")
  return (
    <>
      <AdminTopBar
        title={t("editorTitle")}
        crumbs={[
          {
            label: t(type === "news" ? "crumbNews" : "crumbBlog"),
            href: { pathname: "/admin/posts", query: { tur: type === "news" ? "haber" : "blog" } },
          },
          { label: post ? t("editCrumb") : t("newCrumb") },
        ]}
      />
      <div className="px-4 py-5 lg:px-7 lg:py-6">
        <PostEditor key={post?.id ?? "new"} initial={post} options={options} defaultType={type} />
      </div>
    </>
  )
}
