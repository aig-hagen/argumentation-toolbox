/*
 * AgonProject - The platform to explore different approaches to formal argumentation.
 *
 * Copyright (C) 2026  Artificial Intelligence Group at the Faculty of Mathematics and Computer Science of the FernUniversität in Hagen <https://www.fernuni-hagen.de/aig/en/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import type { IDBPDatabase } from 'idb'
import type { Objectish } from 'immer'
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { ModuleConfig } from '@/app/home/moduleConfig'
import { trackEvent } from '@/app/usage/report'
import { ANALYTICS_EVENTS } from '@/app/usage/signals'
import { availableExports as abstractExports } from '@/modules/abstract-argumentation/export'
import { layout } from '@/modules/abstract-argumentation/layout'
import { AbstractArgumentation } from '@/modules/abstract-argumentation/model'
import { abstractArgumentationModule } from '@/modules/abstract-argumentation/moduleConfig'
import { availableExports as bipolarExports } from '@/modules/bipolar-argumentation/export'
import { BipoloarArgumentation } from '@/modules/bipolar-argumentation/model'
import { bipoloarArgumentationModule } from '@/modules/bipolar-argumentation/moduleConfig'
import { SetAF, type SetAfArgumentData } from '@/modules/collective-attacks-argumentation/model'
import { collectiveAttacksArgumentationModule } from '@/modules/collective-attacks-argumentation/moduleConfig'
import type { ArgumentData } from '@/modules/common/argumentation/model'
import type { DocumentsDB } from '@/modules/common/documents/db'
import {
  LAST_SELECTED_DOCUMENT_KEY,
  useDocumentMetadata,
} from '@/modules/common/documents/useDocuments'
import { saveToFile } from '@/modules/common/export/saveFile'
import { Layout } from '@/modules/common/main-menu/layouting'
import type { FormulaNode } from '@/modules/dialectical-argumentation/condition/formula'
import {
  type AdfArgumentData,
  DialecticalArgumentation,
} from '@/modules/dialectical-argumentation/model'
import { dialecticalArgumentationModule } from '@/modules/dialectical-argumentation/moduleConfig'
import { availableExports as incompleteExports } from '@/modules/incomplete-argumentation/export'
import {
  type IafArgumentData,
  IncompleteArgumentation,
} from '@/modules/incomplete-argumentation/model'
import { incompleteArgumentationModule } from '@/modules/incomplete-argumentation/moduleConfig'
import {
  type PafArgumentData,
  ProbabilisticArgumentation,
} from '@/modules/probabilistic-argumentation/model'
import { probabilisticArgumentationModule } from '@/modules/probabilistic-argumentation/moduleConfig'

export interface ParamSchema {
  name: string
  type: 'int' | 'float' | 'bool' | 'string'
  description: string
  required: boolean
  default: unknown
  min: number | null
  max: number | null
  step: number | null
}

export interface AlgorithmInfo {
  id: string
  description: string
  params: ParamSchema[]
  available: boolean
}

export interface FrameworkTypeInfo {
  id: string
  description: string
  params: ParamSchema[]
}

type GeneratedFramework =
  | AbstractArgumentation<ArgumentData>
  | BipoloarArgumentation<ArgumentData>
  | IncompleteArgumentation<IafArgumentData>
  | ProbabilisticArgumentation<PafArgumentData>
  | DialecticalArgumentation<AdfArgumentData>
  | SetAF<SetAfArgumentData>

const GENERATE_TIMEOUT_MS = 5_000
const MAX_EDGES_FOR_EDITOR = 100

/**
 * Shared random-generation state for the desktop and mobile Generate views: algorithm/type
 * loading, dynamic parameters, the generate request, and open-in-editor / download actions.
 */
export function useGenerate(db: IDBPDatabase<DocumentsDB>, modules: ModuleConfig<Objectish>[]) {
  const route = useRoute()
  const router = useRouter()

  const { documents, createDocument, deleteDocument } = useDocumentMetadata(db, [
    abstractArgumentationModule,
    bipoloarArgumentationModule,
    incompleteArgumentationModule,
    probabilisticArgumentationModule,
    dialecticalArgumentationModule,
    collectiveAttacksArgumentationModule,
  ] as unknown as ModuleConfig<Objectish>[])

  function getNextName(prefix: string): string {
    const allNames = new Set(documents.value.map((d) => d.name))
    if (!allNames.has(prefix)) return prefix
    for (let i = 1; ; i++) {
      const name = prefix + i.toString(10)
      if (!allNames.has(name)) return name
    }
  }

  // --- Framework type from URL ---
  const frameworkTypeId = computed<string>(() => {
    const type = route.query.type
    if (
      type === 'bipolar' ||
      type === 'incomplete' ||
      type === 'probabilistic' ||
      type === 'adf' ||
      type === 'setaf'
    )
      return type
    return 'abstract'
  })

  // Resolve the matching module config via generateHref so names/abbreviations come from a
  // single source of truth (ModuleConfig.id / newNamePrefix).
  const activeModule = computed(
    () => modules.find((m) => m.generateHref === `/generate?type=${frameworkTypeId.value}`) ?? null,
  )

  // Short module name (e.g. "AF") for compact titles.
  const shortName = computed(() => activeModule.value?.newNamePrefix ?? 'AF')

  // --- Algorithm list & framework type params ---
  const algorithms = ref<AlgorithmInfo[]>([])
  const frameworkTypes = ref<FrameworkTypeInfo[]>([])
  const loadError = ref<string | null>(null)
  const selectedAlgorithmId = ref<string>('')

  const selectedAlgorithm = computed(
    () => algorithms.value.find((a) => a.id === selectedAlgorithmId.value) ?? null,
  )

  const selectedFrameworkType = computed(
    () => frameworkTypes.value.find((ft) => ft.id === frameworkTypeId.value) ?? null,
  )

  onMounted(async () => {
    try {
      const [algoRes, ftRes] = await Promise.all([
        fetch('/graph-gen/algorithms', { signal: AbortSignal.timeout(5_000) }),
        fetch('/graph-gen/framework-types', { signal: AbortSignal.timeout(5_000) }),
      ])
      if (!algoRes.ok) throw new Error(`HTTP ${algoRes.status}`)
      if (!ftRes.ok) throw new Error(`HTTP ${ftRes.status}`)

      const algoData = (await algoRes.json()) as AlgorithmInfo[]
      algorithms.value = algoData.filter((a) => a.available)
      const first = algorithms.value[0]
      if (first !== undefined) selectedAlgorithmId.value = first.id

      frameworkTypes.value = (await ftRes.json()) as FrameworkTypeInfo[]
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : 'Failed to load algorithms'
    }
  })

  // --- Algorithm parameters ---
  const paramValues = reactive<Record<string, unknown>>({})
  const seedEnabled = ref(false)
  const seedValue = ref(42)

  const nonSeedParams = computed(
    () => selectedAlgorithm.value?.params.filter((p) => p.name !== 'seed') ?? [],
  )
  const hasSeed = computed(
    () => selectedAlgorithm.value?.params.some((p) => p.name === 'seed') ?? false,
  )

  watch(selectedAlgorithm, (algo) => {
    for (const key of Object.keys(paramValues)) delete paramValues[key]
    if (!algo) return
    for (const p of algo.params) {
      if (p.name === 'seed') continue
      paramValues[p.name] =
        p.default !== null && p.default !== undefined
          ? p.default
          : p.type === 'bool'
            ? false
            : p.type === 'string'
              ? ''
              : 0
    }
    seedEnabled.value = false
  })

  // --- Type-specific parameters ---
  const typeParamValues = reactive<Record<string, unknown>>({})

  watch(selectedFrameworkType, (ft) => {
    for (const key of Object.keys(typeParamValues)) delete typeParamValues[key]
    if (!ft) return
    for (const p of ft.params) {
      typeParamValues[p.name] =
        p.default !== null && p.default !== undefined
          ? p.default
          : p.type === 'bool'
            ? false
            : p.type === 'string'
              ? ''
              : 0
    }
  })

  // --- Generation state ---
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const generated = shallowRef<GeneratedFramework | null>(null)
  const stats = ref<{
    nArgs: number
    nAttacks: number
    nSupports?: number
    nUncertainArgs?: number
    nUncertainAttacks?: number
  } | null>(null)

  async function generate() {
    isLoading.value = true
    error.value = null
    generated.value = null
    stats.value = null

    const params: Record<string, unknown> = { ...paramValues, ...typeParamValues }
    if (seedEnabled.value) params.seed = seedValue.value

    try {
      const response = await fetch('/graph-gen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          algorithm: selectedAlgorithmId.value,
          params,
          framework_type: frameworkTypeId.value,
          timeout: GENERATE_TIMEOUT_MS / 1000,
        }),
        signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
      })
      if (!response.ok) {
        if (response.status === 429)
          throw new Error('Too many requests — please wait a moment before generating again')
        if (response.status === 502 || response.status === 503)
          throw new Error('The server is temporarily unavailable — please try again in a moment')
        const detail = await response.json().catch(() => ({}))
        throw new Error((detail as { detail?: string }).detail ?? `HTTP ${response.status}`)
      }

      const data = (await response.json()) as {
        framework_type: string
        nr_of_arguments: number
        attacks: [number, number][]
        supports: [number, number][]
        uncertain_arguments: number[]
        uncertain_attacks: [number, number][]
        argument_probabilities: number[]
        attack_probabilities: number[]
        conditions: FormulaNode[]
        collective_attacks: { attackers: number[]; target: number }[]
      }

      const n = data.nr_of_arguments
      const radius = Math.max(200, n * 25)

      function circularPos(i: number) {
        const angle = (2 * Math.PI * i) / n
        return { x: radius + radius * Math.cos(angle), y: radius + radius * Math.sin(angle) }
      }

      if (data.framework_type === 'bipolar') {
        const baf = new BipoloarArgumentation<ArgumentData>()
        for (let i = 0; i < n; i++) baf.addArgument(i, { name: String(i + 1), ...circularPos(i) })
        for (const [src, tgt] of data.attacks) baf.addAttack(src - 1, tgt - 1)
        for (const [src, tgt] of data.supports) baf.addSupport(src - 1, tgt - 1)
        generated.value = baf
        stats.value = { nArgs: n, nAttacks: data.attacks.length, nSupports: data.supports.length }
      } else if (data.framework_type === 'incomplete') {
        const iaf = new IncompleteArgumentation<IafArgumentData>()
        const uncertainArgSet = new Set(data.uncertain_arguments)
        for (let i = 0; i < n; i++) {
          iaf.addArgument(i, {
            name: String(i + 1),
            ...circularPos(i),
            uncertain: uncertainArgSet.has(i + 1),
          })
        }
        for (const [src, tgt] of data.attacks) iaf.addDefiniteAttack(src - 1, tgt - 1)
        for (const [src, tgt] of data.uncertain_attacks) iaf.addUncertainAttack(src - 1, tgt - 1)
        generated.value = iaf
        stats.value = {
          nArgs: n,
          nAttacks: data.attacks.length,
          nUncertainArgs: data.uncertain_arguments.length,
          nUncertainAttacks: data.uncertain_attacks.length,
        }
      } else if (data.framework_type === 'probabilistic') {
        const paf = new ProbabilisticArgumentation<PafArgumentData>()
        for (let i = 0; i < n; i++) {
          paf.addArgument(i, {
            name: String(i + 1),
            ...circularPos(i),
            probability: data.argument_probabilities[i] ?? 1,
          })
        }
        data.attacks.forEach(([src, tgt], j) => {
          paf.addAttack(src - 1, tgt - 1, data.attack_probabilities[j] ?? 1)
        })
        generated.value = paf
        stats.value = { nArgs: n, nAttacks: data.attacks.length }
      } else if (data.framework_type === 'adf') {
        const adf = new DialecticalArgumentation<AdfArgumentData>()
        for (let i = 0; i < n; i++) {
          adf.addArgument(i, {
            name: String(i + 1),
            ...circularPos(i),
            condition: { type: 'tautology' },
          })
        }
        for (let i = 0; i < n; i++) {
          adf.setCondition(i, data.conditions[i] ?? { type: 'tautology' })
        }
        generated.value = adf
        stats.value = { nArgs: n, nAttacks: data.attacks.length }
      } else if (data.framework_type === 'setaf') {
        const setaf = new SetAF<SetAfArgumentData>()
        for (let i = 0; i < n; i++) setaf.addArgument(i, { name: String(i + 1), ...circularPos(i) })
        for (const { attackers, target } of data.collective_attacks) {
          setaf.addCollectiveAttack(
            attackers.map((a) => a - 1),
            target - 1,
          )
        }
        generated.value = setaf
        stats.value = { nArgs: n, nAttacks: data.collective_attacks.length }
      } else {
        const af = new AbstractArgumentation<ArgumentData>()
        for (let i = 0; i < n; i++) af.addArgument(i, { name: String(i + 1), ...circularPos(i) })
        for (const [src, tgt] of data.attacks) af.addAttack(src - 1, tgt - 1)
        generated.value = af
        stats.value = { nArgs: n, nAttacks: data.attacks.length }
      }
      // A framework was actually produced — distinct from merely landing on this
      // view. Open-in-editor is tracked separately as a module_open.
      trackEvent(ANALYTICS_EVENTS.generateRun, activeModule.value?.newNamePrefix ?? 'AF', {
        module: activeModule.value?.newNamePrefix ?? 'AF',
        algorithm: selectedAlgorithmId.value,
      })
    } catch (e) {
      error.value =
        e instanceof DOMException && e.name === 'TimeoutError'
          ? `Generation timed out after ${GENERATE_TIMEOUT_MS / 1000} s`
          : e instanceof Error
            ? e.message
            : 'Generation failed'
    } finally {
      isLoading.value = false
    }
  }

  const totalEdges = computed(() => {
    if (stats.value === null) return 0
    return (
      stats.value.nAttacks + (stats.value.nSupports ?? 0) + (stats.value.nUncertainAttacks ?? 0)
    )
  })
  const tooManyEdgesForEditor = computed(() => totalEdges.value > MAX_EDGES_FOR_EDITOR)

  async function openInEditor() {
    const fw = generated.value
    if (fw === null) return
    const prefix = activeModule.value?.newNamePrefix ?? 'AF'
    trackEvent(ANALYTICS_EVENTS.moduleOpen, prefix, { source: 'generate', module: prefix })
    if (fw instanceof AbstractArgumentation) {
      await layout(fw, Layout.ForceDirected)
    }
    const newId = await createDocument(getNextName(prefix), fw as Objectish)
    // Focus the freshly generated document in the editor, not the source AF.
    try {
      localStorage.setItem(LAST_SELECTED_DOCUMENT_KEY, String(newId))
    } catch {
      // Ignore storage failures; the editor just falls back to its default selection.
    }
    const sourceId = Number(route.query.source)
    if (Number.isInteger(sourceId) && sourceId > 0) {
      const sourceDoc = documents.value.find((d) => d.id === sourceId)
      if (sourceDoc?.name === '') {
        await deleteDocument(sourceId)
      }
    }
    await router.push('/')
  }

  const abstractTgfExport = abstractExports.find((e) => e.name === 'Trivial Graph Format (TGF)')!
  const abstractIccmaExport = abstractExports.find((e) => e.name === 'ICCMA')!
  const bipolarTgfExport = bipolarExports.find((e) => e.name === 'Trivial Graph Format (TGF)')!
  const incompleteTgfExport = incompleteExports.find(
    (e) => e.name === 'Trivial Graph Format (TGF)',
  )!

  function downloadTGF() {
    const fw = generated.value
    if (fw === null) return
    const prefix = activeModule.value?.newNamePrefix ?? 'AF'
    if (fw instanceof BipoloarArgumentation) {
      saveToFile(bipolarTgfExport.export(fw).text, prefix, 'tgf')
    } else if (fw instanceof IncompleteArgumentation) {
      saveToFile(incompleteTgfExport.export(fw).text, prefix, 'tgf')
    } else if (fw instanceof AbstractArgumentation) {
      saveToFile(abstractTgfExport.export(fw).text, prefix, 'tgf')
    }
  }

  function downloadICCMA() {
    const fw = generated.value
    if (!(fw instanceof AbstractArgumentation)) return
    saveToFile(abstractIccmaExport.export(fw).text, activeModule.value?.newNamePrefix ?? 'AF', 'af')
  }

  function formatAlgorithmName(id: string): string {
    return id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  function formatParamLabel(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  }

  function formatParamValue(p: ParamSchema, values: Record<string, unknown>): string {
    const val = values[p.name]
    if (typeof val !== 'number' || isNaN(val)) return String(val ?? '')
    if (p.type === 'float') {
      const decimals = p.step != null ? Math.max(0, -Math.floor(Math.log10(p.step))) : 2
      return val.toFixed(decimals)
    }
    return String(val)
  }

  return {
    MAX_EDGES_FOR_EDITOR,
    frameworkTypeId,
    shortName,
    algorithms,
    loadError,
    selectedAlgorithmId,
    selectedAlgorithm,
    selectedFrameworkType,
    paramValues,
    seedEnabled,
    seedValue,
    nonSeedParams,
    hasSeed,
    typeParamValues,
    isLoading,
    error,
    generated,
    stats,
    tooManyEdgesForEditor,
    generate,
    openInEditor,
    downloadTGF,
    downloadICCMA,
    formatAlgorithmName,
    formatParamLabel,
    formatParamValue,
  }
}

export type GenerateController = ReturnType<typeof useGenerate>
