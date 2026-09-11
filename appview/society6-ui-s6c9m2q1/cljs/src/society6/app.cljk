(ns society6.app
  "Society6 appview frontend shell.

  Migrated from the SvelteKit scaffold at
  appview/society6-ui-s6c9m2q1/svelte — which has TWO .svelte files, both
  read and both accounted for here:

  - `src/App.svelte` — the actual content: a heading + one paragraph
    (\"society6-ui-s6c9m2q1\" / \"Vite entry scaffold after SvelteKit
    cleanup.\"), no interactivity, no client-side routing of its own.
  - `src/routes/+page.svelte` — SvelteKit's route-for-`/` file. Its entire
    body is `<script>import App from '../App.svelte';</script><App />` — it
    contributes zero content beyond mounting App.svelte at the root route.

  SvelteKit's file-based router maps exactly one route (`/`) onto exactly one
  view (App.svelte). Porting that faithfully to this workspace's
  one-document/one-bundle/one-mount SPA rule (ADR-2608080100) means: a single
  mount that renders that one view directly — there is no second distinct
  view to hold as app-state-selected data, so no view table / fragment router
  is introduced. This is the honest port of what `+page.svelte` did, not a
  dropped route: rendering `/` as App *is* what both files did together.

  `public/index.html`'s inlined <style> was produced once, at authoring time,
  by `jp-go-dds.page/->page` running on the JVM (via this deps.edn's jp-go-dds
  git/sha), concatenating the vendored `dds.css` with `jp-go-dds.core/ext-css`
  — exactly what `jp-go-dds.page/page` composes for its own <style> block.
  This namespace itself only requires `jp-go-dds.core` — the browser bundle
  does not need `jp-go-dds.page` or `html.core` at runtime; those are JVM-only
  tools used to author the static shell once. Regenerate that shell (e.g. if
  jp-go-dds's core components or ext-rules change) with:

    (require '[jp-go-dds.page :as page] '[clojure.java.io :as io])
    (spit \"public/index.html\"
          (page/->page {:title \"society6-ui-s6c9m2q1\"
                         :description \"Society6 appview frontend shell (reagent + re-frame + jp-go-dds).\"
                         :css (slurp (io/resource \"jp_go_dds/dds.css\"))}
                        [:div {:id \"app\"}]
                        [:script {:src \"js/app.js\"}]))"
  (:require [reagent.dom :as rdom]
            [re-frame.core :as rf]
            [jp-go-dds.core :as dds]))

;; --- state ------------------------------------------------------------------

(def default-db
  "The two pieces of text App.svelte rendered as bare markup literals (a
  heading and one paragraph), now held as re-frame app-db data instead, so
  there is real event/sub logic to test."
  {:page/heading "society6-ui-s6c9m2q1"
   :page/description "Vite entry scaffold after SvelteKit cleanup."})

(rf/reg-event-db
 :initialize-db
 (fn [_ _] default-db))

(rf/reg-sub
 :page/heading
 (fn [db _] (:page/heading db)))

(rf/reg-sub
 :page/description
 (fn [db _] (:page/description db)))

;; --- view ---------------------------------------------------------------

(defn app
  "The whole page: a DADS heading + lead paragraph, centered the same way the
  original App.svelte's `main { display: grid; place-content: center; }`
  scaffold was — via the `dds-ext-hero`/`dds-ext-center` layout classes
  jp-go-dds.core already ships in `ext-css`, not app-authored CSS. This is
  what both App.svelte and +page.svelte together rendered at route `/`."
  []
  [:main {:class "dds-ext-hero dds-ext-center"}
   (dds/heading 1 @(rf/subscribe [:page/heading]))
   [:p {:class "dds-ext-lead"} @(rf/subscribe [:page/description])]])

;; --- mount ------------------------------------------------------------------

(defn render []
  (rdom/render [app] (.getElementById js/document "app")))

(defn ^:export main []
  (rf/dispatch-sync [:initialize-db])
  (render))
