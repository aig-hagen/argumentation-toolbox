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
/** Stable code for a localized import-error message under `errors.import.*`. */
export type ImportErrorCode = 'jsonSyntax' | 'schemaMismatch' | 'invalidData' | 'validation'

/**
 * A structured import failure. Carries a stable `code` plus interpolation `params`
 * and an optional technical `detail` (e.g. a raw parser or Zod message) instead of a
 * finalized English string, so the presentation boundary can localize it.
 */
export abstract class ImportError {
  abstract code: ImportErrorCode
  abstract params: { fileName: string }
  detail?: string
}

export class JsonSyntaxError extends ImportError {
  code = 'jsonSyntax' as const
  params: { fileName: string }
  constructor(cause: string, fileName: string) {
    super()
    this.params = { fileName }
    this.detail = cause
  }
}

export class SchemaMismatchError extends ImportError {
  code = 'schemaMismatch' as const
  params: { fileName: string }
  constructor(cause: string, fileName: string) {
    super()
    this.params = { fileName }
    this.detail = cause
  }
}

export class InvalidDataError extends ImportError {
  code = 'invalidData' as const
  params: { fileName: string }
  constructor(cause: string, fileName: string) {
    super()
    this.params = { fileName }
    this.detail = cause
  }
}

export class ValidationError extends ImportError {
  code = 'validation' as const
  params: { fileName: string }
  constructor(cause: string, fileName: string) {
    super()
    this.params = { fileName }
    this.detail = cause
  }
}

export type DeserializationResult<ValueT> = DeserializationSuccess<ValueT> | DeserializationError

export interface DeserializationSuccess<ValueT> {
  success: true
  data: ValueT
  errors?: never
}
export interface DeserializationError {
  success: false
  data?: never
  errors: ImportError[]
}
