"use client"

import { useEffect, useState } from "react"

import { apiFetch } from "./api-browser"

/** Aynı sayfada tekrar seçilen tür/il için istek atılmasın diye bellekte tutulan yanıtlar. */
const cache = new Map<string, unknown[]>()

/**
 * Tarayıcıda sözlük listesi (ırklar, ilçeler) okur; `path` null ise boş liste. Türe göre ırk, ile göre ilçe gibi
 * bağımlı seçimler için. Not: TanStack Query 6. adımda (ilan listeleme) gelince bunun yerini alabilir.
 */
export function useDictionary<T>(path: string | null): { items: T[]; loading: boolean } {
  const [state, setState] = useState<{ path: string | null; items: T[] }>({
    path,
    items: path ? ((cache.get(path) as T[] | undefined) ?? []) : [],
  })

  useEffect(() => {
    if (!path || cache.has(path)) return
    let cancelled = false
    void apiFetch<T[]>(path).then(({ data }) => {
      if (data) cache.set(path, data)
      if (!cancelled) setState({ path, items: data ?? [] })
    })
    return () => {
      cancelled = true
    }
  }, [path])

  const cached = path ? (cache.get(path) as T[] | undefined) : undefined
  if (cached) return { items: cached, loading: false }
  return { items: state.path === path ? state.items : [], loading: Boolean(path) }
}
