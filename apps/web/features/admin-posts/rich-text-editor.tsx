"use client"

import { isSafeHref } from "@pati-dostu/validators"
import Image from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extensions"
import { type Editor, EditorContent, type JSONContent, useEditor, useEditorState } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react"

import { Field } from "@/components/form/field"
import { Input } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { Callout } from "./callout"
import { IMAGE_ACCEPT, UploadError, uploadPostImage } from "./upload"

/**
 * Editör içeriğinin görünümü (globals.css korunduğu için yerel sınıflarla): başlıklar, listeler, alıntı, bağlantı,
 * görsel, İpucu kutusu (başlığı `data-title`'dan) ve boş belge yer tutucusu. Herkese açık çiziciye yakın tutulur.
 */
const contentClass = cn(
  "min-h-96 px-5 py-5 text-[17px] leading-relaxed text-heading focus:outline-none lg:px-7",
  "[&>*+*]:mt-4 [&_strong]:font-extrabold",
  "[&_h2]:mt-7 [&_h2]:text-h4 [&_h2]:font-extrabold [&_h3]:mt-5 [&_h3]:text-h5 [&_h3]:font-extrabold",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:pl-1 [&_li+li]:mt-1.5",
  "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-body [&_blockquote]:italic",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_hr]:my-6 [&_hr]:border-border",
  "[&_img]:w-full [&_img]:rounded-card [&_img.ProseMirror-selectednode]:outline-3 [&_img.ProseMirror-selectednode]:outline-ring",
  "[&_aside]:grid [&_aside]:gap-2 [&_aside]:rounded-card [&_aside]:bg-smoke [&_aside]:p-4",
  "[&_aside]:before:font-extrabold [&_aside]:before:text-primary [&_aside]:before:content-[attr(data-title)]",
  "[&_aside[data-tone=info]]:border-2 [&_aside[data-tone=info]]:border-primary [&_aside[data-tone=info]]:bg-background",
  "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-body [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
)

/**
 * Blog / haber metin editörü (Tiptap; tasarım 07-admin/06): araç çubuğu (B, I, H2, H3, madde, numaralı liste, alıntı,
 * bağlantı, görsel, İpucu), içerik ve alt satır. Yalnız herkese açık çizicinin tanıdığı düğümler açıktır (kod, üstü
 * çizili, altı çizili kapalı); bağlantılar yalnız http(s) ya da site içi. Değişiklikte belgeyi `onChange` ile bildirir.
 */
export function RichTextEditor({
  initial,
  onChange,
  labelId,
  describedBy,
  invalid,
  footer,
}: {
  initial: JSONContent | null
  onChange: (doc: JSONContent) => void
  /** Görünür etiketin id'si (aria-labelledby). */
  labelId: string
  describedBy?: string
  invalid?: boolean
  footer: ReactNode
}) {
  const t = useTranslations("AdminPosts")
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => isSafeHref(url),
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
        },
      }),
      Image.configure({ inline: false }),
      Callout,
      Placeholder.configure({ placeholder: t("bodyPlaceholder") }),
    ],
    content: initial ?? undefined,
    editorProps: {
      attributes: {
        class: contentClass,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  // Hata durumu değişince editörün erişilebilirlik özelliklerini güncelle.
  useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        attributes: {
          class: contentClass,
          role: "textbox",
          "aria-multiline": "true",
          "aria-labelledby": labelId,
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
          ...(invalid ? { "aria-invalid": "true" } : {}),
        },
      },
    })
  }, [editor, labelId, describedBy, invalid])

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border bg-background",
        invalid ? "border-destructive" : "border-border",
        "focus-within:border-primary"
      )}
    >
      <Toolbar editor={editor} />
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-96" aria-hidden="true" />}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[13px] text-body">
        {footer}
      </div>
    </div>
  )
}

/** Araç çubuğu düğmesi: 44 px dokunma alanı, ekran okuyucuya tam ad, açık/kapalı durumu `aria-pressed`. */
function ToolButton({
  label,
  pressed,
  onClick,
  disabled,
  children,
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-[15px] font-extrabold text-heading transition-colors",
        "hover:bg-smoke focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        pressed && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  )
}

/** Editörün üstündeki biçim düğmeleri; bağlantı ve görsel kendi pencerelerini açar. */
function Toolbar({ editor }: { editor: Editor | null }) {
  const t = useTranslations("AdminPosts")
  const [dialog, setDialog] = useState<"link" | "image" | null>(null)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            callout: e.isActive("callout"),
          }
        : null,
  })
  const chain = () => editor!.chain().focus()
  const off = !editor

  return (
    <div
      role="group"
      aria-label={t("toolbar")}
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-canvas px-2 py-1.5"
    >
      <ToolButton label={t("toolBold")} pressed={state?.bold} disabled={off} onClick={() => chain().toggleBold().run()}>
        B
      </ToolButton>
      <ToolButton
        label={t("toolItalic")}
        pressed={state?.italic}
        disabled={off}
        onClick={() => chain().toggleItalic().run()}
      >
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton
        label={t("toolH2")}
        pressed={state?.h2}
        disabled={off}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolButton>
      <ToolButton
        label={t("toolH3")}
        pressed={state?.h3}
        disabled={off}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolButton>
      <ToolButton
        label={t("toolBullet")}
        pressed={state?.bullet}
        disabled={off}
        onClick={() => chain().toggleBulletList().run()}
      >
        •
      </ToolButton>
      <ToolButton
        label={t("toolOrdered")}
        pressed={state?.ordered}
        disabled={off}
        onClick={() => chain().toggleOrderedList().run()}
      >
        1.
      </ToolButton>
      <ToolButton
        label={t("toolQuote")}
        pressed={state?.quote}
        disabled={off}
        onClick={() => chain().toggleBlockquote().run()}
      >
        ❝
      </ToolButton>
      <ToolButton label={t("toolLink")} pressed={state?.link} disabled={off} onClick={() => setDialog("link")}>
        {t("toolLinkShort")}
      </ToolButton>
      <ToolButton label={t("toolImage")} disabled={off} onClick={() => setDialog("image")}>
        {t("toolImageShort")}
      </ToolButton>
      <ToolButton
        label={t("toolTip")}
        pressed={state?.callout}
        disabled={off}
        onClick={() =>
          chain()
            .toggleWrap("callout", { tone: "tip", title: t("tipTitle") })
            .run()
        }
      >
        {t("toolTipShort")}
      </ToolButton>
      {editor && dialog === "link" && <LinkDialog editor={editor} onClose={() => setDialog(null)} />}
      {editor && dialog === "image" && <ImageDialog editor={editor} onClose={() => setDialog(null)} />}
    </div>
  )
}

/** Yerel <dialog> kabuğu: açılınca modal olur, Esc / arka plan tıklaması `onClose`'u çağırır. */
function EditorDialog({
  title,
  onClose,
  busy = false,
  onSubmit,
  children,
}: {
  title: string
  onClose: () => void
  busy?: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      className={cn(
        "m-0 w-full max-w-none bg-background p-0 text-heading backdrop:bg-heading/60",
        "max-sm:top-auto max-sm:bottom-0 max-sm:rounded-t-dialog sm:m-auto sm:max-w-md sm:rounded-dialog"
      )}
    >
      <form onSubmit={onSubmit} className="grid gap-4 p-6" noValidate>
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        {children}
      </form>
    </dialog>
  )
}

/**
 * Bağlantı ekle / düzenle / kaldır. Adres yalnız http(s) ya da site içi ("/ilanlar"). Seçili metin yoksa adresin
 * kendisi bağlantılı metin olarak eklenir; imleç bir bağlantıdaysa o bağlantının tamamı güncellenir.
 */
function LinkDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const t = useTranslations("AdminPosts")
  const existing = (editor.getAttributes("link").href as string | undefined) ?? ""
  const [href, setHref] = useState(existing)
  const [error, setError] = useState<string | null>(null)

  /** Bağlantıyı uygular (geçersiz adreste alan hatası). */
  const apply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = href.trim()
    if (!isSafeHref(value)) return setError(t("linkInvalid"))
    const chain = editor.chain().focus().extendMarkRange("link")
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href: value } }] }).run()
    } else chain.setLink({ href: value }).run()
    onClose()
  }

  return (
    <EditorDialog title={existing ? t("linkEditTitle") : t("linkTitle")} onClose={onClose} onSubmit={apply}>
      <Field id="link-href" label={t("linkLabel")} description={t("linkHint")} error={error ?? undefined}>
        {(control) => (
          <Input
            {...control}
            type="url"
            inputMode="url"
            autoComplete="off"
            autoFocus
            value={href}
            onChange={(e) => {
              setHref(e.target.value)
              setError(null)
            }}
            placeholder="https://"
          />
        )}
      </Field>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        {existing && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive sm:mr-auto"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
              onClose()
            }}
          >
            {t("linkRemove")}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit">{existing ? t("linkUpdate") : t("linkAdd")}</Button>
      </div>
    </EditorDialog>
  )
}

/**
 * Görsel ekle: dosya seç + alternatif metin (zorunlu — erişilebilirlik), yükle (küçültülüp depoya), imlecin olduğu
 * yere ekle. Yükleme sürerken pencere kapatılamaz; hata çevrilip alanın altında gösterilir.
 */
function ImageDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const t = useTranslations("AdminPosts")
  const errorMessage = useErrorMessage()
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const [errors, setErrors] = useState<{ file?: string; alt?: string }>({})

  /** Doğrular, yükler ve görseli ekler. */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const next = {
      file: file ? undefined : t("imageFileRequired"),
      alt: alt.trim() ? undefined : t("imageAltRequired"),
    }
    setErrors(next)
    if (!file || next.alt) return
    setProgress(0)
    try {
      const { url } = await uploadPostImage(file, setProgress)
      editor.chain().focus().setImage({ src: url, alt: alt.trim() }).run()
      onClose()
    } catch (error) {
      setProgress(null)
      setErrors({ file: errorMessage(error instanceof UploadError ? error.code : "UPLOAD_FAILED") })
    }
  }

  const busy = progress !== null
  return (
    <EditorDialog title={t("imageTitle")} onClose={onClose} busy={busy} onSubmit={submit}>
      <Field id="image-file" label={t("imageFile")} description={t("imageFileHint")} error={errors.file}>
        {(control) => (
          <input
            {...control}
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setErrors((x) => ({ ...x, file: undefined }))
            }}
            className="min-h-tap w-full rounded-lg border border-input p-2 text-[15px] file:mr-3 file:rounded-md file:border-0 file:bg-smoke file:px-3 file:py-2 file:font-bold file:text-heading focus-visible:outline-2 focus-visible:outline-ring"
          />
        )}
      </Field>
      <Field id="image-alt" label={t("imageAlt")} description={t("imageAltHint")} error={errors.alt} required>
        {(control) => (
          <Input
            {...control}
            value={alt}
            maxLength={200}
            disabled={busy}
            onChange={(e) => {
              setAlt(e.target.value)
              setErrors((x) => ({ ...x, alt: undefined }))
            }}
          />
        )}
      </Field>
      {busy && (
        <div
          role="progressbar"
          aria-label={t("uploading")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((progress ?? 0) * 100)}
          className="h-2 overflow-hidden rounded-full bg-smoke"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${(progress ?? 0) * 100}%` }} />
        </div>
      )}
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
          {t("imageAdd")}
        </Button>
      </div>
    </EditorDialog>
  )
}
