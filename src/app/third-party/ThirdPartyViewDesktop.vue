<!--
  AgonProject - The platform to explore different approaches to formal argumentation.

  Copyright (C) 2026  Artificial Intelligence Group at the Faculty of Mathematics and Computer Science of the FernUniversität in Hagen <https://www.fernuni-hagen.de/aig/en/>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { attributions, ctanAttributions, getAttributionId } from '@/app/third-party/attributions'

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="m-auto flex flex-nowrap justify-center my-4 gap-4">
    <aside class="w-3xs">
      <ul class="menu">
        <h2 class="menu-title">{{ t('thirdParty.title') }}</h2>
        <li>
          <a href="tex-packages">{{ t('thirdParty.texPackages') }}</a>
          <ul>
            <li v-for="attribution of ctanAttributions" :key="getAttributionId(attribution)">
              <a :href="'#' + getAttributionId(attribution)"
                ><template v-if="attribution.scope !== undefined"
                  >@{{ attribution.scope }}/</template
                >{{ attribution.name }}</a
              >
            </li>
          </ul>
        </li>
        <li v-for="attribution of attributions" :key="getAttributionId(attribution)">
          <a :href="'#' + getAttributionId(attribution)"
            ><template v-if="attribution.scope !== undefined">@{{ attribution.scope }}/</template
            >{{ attribution.name }}</a
          >
        </li>
      </ul>
    </aside>
    <main class="max-w-3xl">
      <h1 class="m-1 font-bold text-xl">{{ t('thirdParty.title') }}</h1>
      <p class="m-1 mb-4">{{ t('thirdParty.intro') }}</p>
      <h2 id="tex-packages" class="m-1 font-bold text-lg">{{ t('thirdParty.texPackages') }}</h2>
      <p class="m-1 mb-4">{{ t('thirdParty.texIntro') }}</p>
      <template v-for="attribution of ctanAttributions" :key="getAttributionId(attribution)">
        <h3 class="m-1 font-bold" :id="getAttributionId(attribution)">
          <template v-if="attribution.scope !== undefined">@{{ attribution.scope }}/</template
          >{{ attribution.name
          }}<template v-if="attribution.version !== undefined">@{{ attribution.version }}</template>
        </h3>

        <p class="m-1">
          <i18n-t
            v-if="attribution.publisher"
            keypath="thirdParty.publishedWithPublisher"
            tag="span"
          >
            <template #publisher
              ><em>{{ attribution.publisher }}</em></template
            >
            <template #license
              ><em>{{ attribution.license }}</em></template
            >
            <template #repository
              ><a class="link link-primary" :href="attribution.repository">{{
                attribution.repository
              }}</a></template
            >
          </i18n-t>
          <i18n-t v-else keypath="thirdParty.publishedNoPublisher" tag="span">
            <template #license
              ><em>{{ attribution.license }}</em></template
            >
            <template #repository
              ><a class="link link-primary" :href="attribution.repository">{{
                attribution.repository
              }}</a></template
            >
          </i18n-t>
        </p>
        <blockquote class="m-1 alert whitespace-pre-wrap w-fit" v-if="attribution.licenseText">
          {{ attribution.licenseText }}
        </blockquote>
        <p class="m-1" v-else>{{ t('thirdParty.noLicenseText') }}</p>
      </template>
      <template v-for="attribution of attributions" :key="getAttributionId(attribution)">
        <h2 class="m-1 font-bold" :id="getAttributionId(attribution)">
          <template v-if="attribution.scope !== undefined">@{{ attribution.scope }}/</template
          >{{ attribution.name
          }}<template v-if="attribution.version !== undefined">@{{ attribution.version }}</template>
        </h2>

        <p class="m-1">
          <i18n-t
            v-if="attribution.publisher"
            keypath="thirdParty.publishedWithPublisher"
            tag="span"
          >
            <template #publisher
              ><em>{{ attribution.publisher }}</em></template
            >
            <template #license
              ><em>{{ attribution.license }}</em></template
            >
            <template #repository
              ><a class="link link-primary" :href="attribution.repository">{{
                attribution.repository
              }}</a></template
            >
          </i18n-t>
          <i18n-t v-else keypath="thirdParty.publishedNoPublisher" tag="span">
            <template #license
              ><em>{{ attribution.license }}</em></template
            >
            <template #repository
              ><a class="link link-primary" :href="attribution.repository">{{
                attribution.repository
              }}</a></template
            >
          </i18n-t>
        </p>
        <blockquote class="m-1 alert whitespace-pre-wrap w-fit" v-if="attribution.licenseText">
          {{ attribution.licenseText }}
        </blockquote>
        <p class="m-1" v-else>{{ t('thirdParty.noLicenseText') }}</p>
      </template>
    </main>
  </div>
</template>
