import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import { requireAdmin } from "@/lib/admin"
import { apiServer } from "@/lib/server-api"

import { PostEditor } from "./post-editor"
import { AdminPageHeader } from "./posts-list-view"
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

  return (
    <div className="mx-auto grid max-w-site gap-5 px-4 py-6 lg:px-6 lg:py-8">
      <AdminPageHeader
        title={t("editorTitle")}
        crumbs={[{ label: t("listTitle"), href: "/admin/posts" }, { label: post ? t("editCrumb") : t("newCrumb") }]}
      />
      <PostEditor
        key={post?.id ?? "new"}
        initial={post}
        options={options}
        defaultType={sp.tur === "haber" ? "news" : "blog"}
      />
    </div>
  )
}
