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
import { expect, test } from 'vitest'

import { AbstractArgumentation } from '@/modules/abstract-argumentation/model'
import { loadFromString, saveAsString } from '@/modules/abstract-argumentation/save/saveFormat'
import type { ArgumentData } from '@/modules/common/argumentation/model'
import { JsonSyntaxError, ValidationError } from '@/modules/common/save/load'

const FILE_NAME = 'test.json'

function loadWithErrors(badData: string) {
  const result = loadFromString(badData, FILE_NAME)
  expect(result.errors).toBeDefined()
  return result.errors!
}

test('fail importing JSON with syntax error', () => {
  const badData = '{[}'

  const errors = loadWithErrors(badData)

  expect.soft(errors[0]).toBeInstanceOf(JsonSyntaxError)
  expect.soft(errors[0]?.code).toBe('jsonSyntax')
  expect.soft(errors[0]?.params.fileName).toBe(FILE_NAME)
  expect
    .soft(errors[0]?.detail)
    .toBe("Expected property name or '}' in JSON at position 1 (line 1 column 2)")
})

test('fail importing JSON with missing property', () => {
  const data = {
    apiVersion: 'argumentation-framework/v1',
    arguments: {},
  }
  const stringifiedData = JSON.stringify(data)

  const errors = loadWithErrors(stringifiedData)

  expect(errors).toHaveLength(1)
  expect.soft(errors[0]).toBeInstanceOf(ValidationError)
  expect.soft(errors[0]?.code).toBe('validation')
  expect.soft(errors[0]?.params.fileName).toBe(FILE_NAME)
  expect
    .soft(errors[0]?.detail)
    .toEqual('✖ Invalid input: expected array, received undefined\n' + '  → at attacks')
})

test('fail importing JSON with invalid id', () => {
  const stringifiedData = `{
    "apiVersion": "argumentation-framework/v1",
    "arguments": {
      "a1": {
        "name": "aName",
        "x": 0,
        "y": 0
      }
    },
    "attacks": []
  }`

  const errors = loadWithErrors(stringifiedData)
  expect(errors).toHaveLength(1)
  expect.soft(errors[0]).toBeInstanceOf(ValidationError)
  expect.soft(errors[0]?.code).toBe('validation')
  expect.soft(errors[0]?.params.fileName).toBe(FILE_NAME)
  expect.soft(errors[0]?.detail).toEqual('✖ Invalid key in record\n' + '  → at arguments.a1')
})

test('fail importing JSON with duplicate attack', () => {
  const data = {
    apiVersion: 'argumentation-framework/v1',
    arguments: {
      1: {
        name: 'aName',
        x: 0,
        y: 0,
      },
      2: {
        name: 'aName',
        x: 0,
        y: 0,
      },
    },
    attacks: [
      [1, 2],
      [1, 2],
    ],
  }
  const stringifiedData = JSON.stringify(data)

  const errors = loadWithErrors(stringifiedData)
  expect(errors).toHaveLength(1)
  expect.soft(errors[0]).toBeInstanceOf(ValidationError)
  expect.soft(errors[0]?.code).toBe('validation')
  expect.soft(errors[0]?.params.fileName).toBe(FILE_NAME)
  expect
    .soft(errors[0]?.detail)
    .toEqual(
      '✖ Duplicate attack from `1` to `2`.\n' +
        '  → at attacks[0]\n' +
        '✖ Duplicate attack from `1` to `2`.\n' +
        '  → at attacks[1]',
    )
})

test('fail importing JSON with unknown attacks', () => {
  const data = {
    apiVersion: 'argumentation-framework/v1',
    arguments: {},
    attacks: [[1, 2]],
  }
  const stringifiedData = JSON.stringify(data)

  const errors = loadWithErrors(stringifiedData)
  expect(errors).toHaveLength(1)
  expect.soft(errors[0]).toBeInstanceOf(ValidationError)
  expect.soft(errors[0]?.code).toBe('validation')
  expect.soft(errors[0]?.params.fileName).toBe(FILE_NAME)
  expect
    .soft(errors[0]?.detail)
    .toEqual(
      '✖ Unkonwn argument `1`.\n' +
        '  → at attacks[0][0]\n' +
        '✖ Unkonwn argument `2`.\n' +
        '  → at attacks[0][1]',
    )
})

test('load successfully', () => {
  const argumentation = new AbstractArgumentation<ArgumentData>()
  argumentation.addArgument(0, {
    name: 'name1',
    x: 1,
    y: 2,
  })
  argumentation.addArgument(1, {
    name: 'aName2',
    x: 3,
    y: 4,
  })
  argumentation.addAttack(0, 1)
  argumentation.addAttack(1, 0)
  argumentation.addAttack(1, 1)
  const stringifiedData = saveAsString(argumentation, FILE_NAME)

  const result = loadFromString(stringifiedData, FILE_NAME)

  expect(result.success).toBeTruthy()
  expect(result.data).toBeDefined()
  const loadedArgumentation = result.data!
  expect(loadedArgumentation.arguments()).toEqual(argumentation.arguments())
  expect(loadedArgumentation.attacks()).toEqual(argumentation.attacks())
})
