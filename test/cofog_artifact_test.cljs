#!/usr/bin/env nbb
;; test/cofog_artifact_test.cljs — do the two committed COFOG artifacts still
;; describe each other, and the catalog the registry keys records by?
;;
;; The frontend serves two generated files out of
;; appview/society6-ui-s6c9m2q1/static/data/:
;;
;;   cofog-directory-summary.json  a rollup: totals, per-group counts, and the
;;                                 102 directories those numbers summarise
;;   cofog-components.json         the 101 MCP components the portal lists
;;
;; Both are frozen. Their generator
;; (appview/society6-ui-s6c9m2q1/scripts/generate_cofog_directory_summary.sh)
;; resolves its inputs from the old etzhayyim-root monorepo layout, which does
;; not exist here, so it exits 1 with `find: ... No such file or directory` and
;; these files cannot be regenerated in this repository (docs/operator-quickstart.md
;; records the measured failure). That is exactly what makes them worth checking:
;; the only way they can change here is a hand edit, and a hand edit that keeps
;; the file valid JSON while moving a count is invisible to every other check
;; this repository has. `npm run typecheck` does not read them; the vitest suite
;; in kotoba/ does not read them; nothing else does either.
;;
;; What is checked, and why each one can rot on its own:
;;
;;   1. The rollup summarises its own list. `totals` and `groups[]` are written
;;      once and then quoted -- README.md and docs/operator-quickstart.md both
;;      cite "102 directories". Editing one entry of `directories` leaves every
;;      derived number stale while the file goes on asserting it.
;;
;;   2. The components list is exactly the in-portal directories. Two files
;;      naming the same set is two chances to update only one, and the one that
;;      is not updated is the one the portal renders.
;;
;;   3. No two COFOG codes collapse to the same registry key. kotoba/src/types.ts
;;      derives a record key by lowercasing the code and replacing runs of
;;      non-alphanumerics with "-", and kotoba/src/registry.ts keys every
;;      cofogService record by it. Two distinct codes that differ only in case or
;;      punctuation therefore address ONE record: registerCofog finds the first
;;      and returns `alreadyExists`, and the second service is silently never
;;      stored. Today's 97 distinct codes give 97 distinct keys; that is a
;;      property of the data, and the data is what can change.
;;
;;   4. The prose that quotes these files still quotes them correctly. README.md
;;      and the quickstart both state the snapshot's date and its directory
;;      count in running text next to a file that can be edited. Fenced code
;;      blocks are stripped before this one is applied -- a document that shows
;;      this check's own failure output would otherwise satisfy it with the
;;      wrong number, because the transcript for a 101-directory artifact
;;      contains the string "101 directories".
;;
;; ## Exit codes -- "could not measure" is not "measured clean"
;;
;;   0  every invariant held, on a non-empty dataset
;;   1  an invariant was violated (the message names which)
;;   2  REFUSED -- an input could not be read, so no claim is made
;;
;; Exit 2 exists because the cheapest way to write this check wrong is to let a
;; missing, empty or unparseable artifact fall through the same `seq` as a clean
;; one and print OK. An empty `directories` list satisfies every equality below
;; -- 0 = 0 = 0 -- so emptiness has to be refused before the equalities are
;; reached, not after.
;;
;; Nothing here touches the network, npm, or a browser.
;;
;; Usage:  nbb test/cofog_artifact_test.cljs

(ns cofog-artifact-test
  (:require ["node:fs" :as fs]
            ["node:path" :as path]
            [clojure.string :as str]))

(def root
  (path/resolve (path/dirname (or js/__filename "test/cofog_artifact_test.cljs")) ".."))

(def data-dir "appview/society6-ui-s6c9m2q1/static/data")
(def summary-rel (str data-dir "/cofog-directory-summary.json"))
(def components-rel (str data-dir "/cofog-components.json"))

(def failures (atom []))
(defn- fail! [invariant detail]
  (swap! failures conj (str "FAIL " invariant ": " detail)))

(defn- refuse! [why]
  (println (str "REFUSED " why))
  (println "cofog-artifact-check: no claim made — the inputs could not be read.")
  (js/process.exit 2))

;; ── inputs ──────────────────────────────────────────────────────────────────

(defn- read-json [rel]
  (let [p (path/join root rel)]
    (when-not (fs/existsSync p) (refuse! (str rel " does not exist")))
    (let [text (fs/readFileSync p "utf8")]
      (when (str/blank? text) (refuse! (str rel " is empty")))
      (try
        (js->clj (js/JSON.parse text) :keywordize-keys true)
        (catch :default e
          (refuse! (str rel " is not readable JSON: " (.-message e))))))))

(defn- strip-code-blocks
  "Drop fenced ``` blocks. The prose check below asks whether a document still
   quotes the artifact's numbers, and a document that shows this check's own
   failure output would otherwise satisfy it with the WRONG number: the
   transcript for a 101-directory artifact literally contains the string
   \"101 directories\". A quoted failure message is not a claim the document
   makes -- only the prose around it is."
  [text]
  (->> (str/split text #"(?m)^```")
       (keep-indexed (fn [i part] (when (even? i) part)))
       (str/join "\n")))

(defn- read-text [rel]
  (let [p (path/join root rel)]
    (when-not (fs/existsSync p) (refuse! (str rel " does not exist")))
    (strip-code-blocks (fs/readFileSync p "utf8"))))

(def summary (read-json summary-rel))
(def components (read-json components-rel))
(def readme (read-text "README.md"))
(def quickstart (read-text "docs/operator-quickstart.md"))

(def directories (:directories summary))
(def groups (:groups summary))
(def excluded (:excludedFromPortal summary))
(def totals (:totals summary))

;; ── evidence floor ──────────────────────────────────────────────────────────
;;
;; Every equality below is satisfied by an empty artifact. Refuse first.

(when-not (map? summary) (refuse! (str summary-rel " is not a JSON object")))
(when-not (vector? components) (refuse! (str components-rel " is not a JSON array")))
(when-not (seq directories)
  (refuse! (str summary-rel " has no :directories — an empty list satisfies every"
                " count below, so there is nothing here to check")))
(when-not (seq groups) (refuse! (str summary-rel " has no :groups")))
(when-not (map? totals) (refuse! (str summary-rel " has no :totals object")))
(when-not (seq components) (refuse! (str components-rel " is an empty list")))

;; ── 1. the rollup summarises its own list ───────────────────────────────────

(let [n         (count directories)
      n-svelte  (count (filter :hasSvelte directories))
      n-portal  (count (filter :inPortal directories))
      n-excl    (count excluded)]
  (when (not= (:directories totals) n)
    (fail! "summary-total-directories-matches-the-list"
           (str "totals.directories=" (:directories totals) " but directories[] has " n)))
  (when (not= (:withSvelte totals) n-svelte)
    (fail! "summary-total-with-svelte-matches-the-list"
           (str "totals.withSvelte=" (:withSvelte totals) " but " n-svelte
                " of " n " directories have hasSvelte true")))
  (when (not= (:inPortal totals) n-portal)
    (fail! "summary-total-in-portal-matches-the-list"
           (str "totals.inPortal=" (:inPortal totals) " but " n-portal
                " of " n " directories have inPortal true")))
  (when (not= (:excludedFromPortal totals) n-excl)
    (fail! "summary-excluded-count-matches-its-list"
           (str "totals.excludedFromPortal=" (:excludedFromPortal totals)
                " but excludedFromPortal[] has " n-excl " entr(ies)")))
  ;; the two halves of the portal partition the directories
  (when (not= n (+ n-portal n-excl))
    (fail! "summary-portal-split-covers-every-directory"
           (str n " directories, but " n-portal " in portal + " n-excl
                " excluded = " (+ n-portal n-excl)))))

;; sums over groups[] must reproduce totals — the per-group table is edited
;; separately from the totals block
(let [sum (fn [k] (reduce + 0 (map #(get % k 0) groups)))]
  (doseq [[gk tk inv] [[:count :directories "group-counts-sum-to-total-directories"]
                       [:withSvelte :withSvelte "group-with-svelte-sums-to-total"]
                       [:inPortal :inPortal "group-in-portal-sums-to-total"]]]
    (when (not= (sum gk) (get totals tk))
      (fail! inv (str "groups[]." (name gk) " sums to " (sum gk)
                      " but totals." (name tk) " is " (get totals tk))))))

;; and each group row must match the directories that carry that group
(let [by-group (group-by :group directories)]
  (when (not= (set (keys by-group)) (set (map :group groups)))
    (fail! "group-rows-cover-exactly-the-groups-present"
           (str "directories carry groups " (pr-str (sort (keys by-group)))
                " but groups[] rows are " (pr-str (sort (map :group groups))))))
  (doseq [g groups
          :let [ds (get by-group (:group g))]]
    (when ds
      (when (not= (:count g) (count ds))
        (fail! "group-row-count-matches-its-directories"
               (str "group " (:group g) " says count=" (:count g)
                    " but " (count ds) " directories carry it")))
      (when (not= (:withSvelte g) (count (filter :hasSvelte ds)))
        (fail! "group-row-with-svelte-matches-its-directories"
               (str "group " (:group g) " says withSvelte=" (:withSvelte g)
                    " but " (count (filter :hasSvelte ds)) " of its directories have hasSvelte")))
      (when (not= (:inPortal g) (count (filter :inPortal ds)))
        (fail! "group-row-in-portal-matches-its-directories"
               (str "group " (:group g) " says inPortal=" (:inPortal g)
                    " but " (count (filter :inPortal ds)) " of its directories have inPortal"))))))

;; a directory's group is the prefix of its code that the rollup buckets on.
;; If they drift, a directory is counted under a group it does not belong to.
(doseq [d directories]
  (when-not (str/starts-with? (str (:code d)) (str (:group d)))
    (fail! "directory-group-is-a-prefix-of-its-code"
           (str (pr-str (:name d)) " has code " (pr-str (:code d))
                " under group " (pr-str (:group d))))))

;; names address directories; two rows sharing one is a silently lost directory
(let [names (map :name directories)]
  (when (not= (count names) (count (set names)))
    (fail! "directory-names-are-unique"
           (str (- (count names) (count (set names))) " duplicate name(s): "
                (pr-str (sort (map first (filter #(> (val %) 1) (frequencies names))))))))) 

;; ── 2. components are exactly the in-portal directories ─────────────────────

(let [comp-names (set (map :component components))
      portal     (set (map :name (filter :inPortal directories)))
      excl-names (set (map :name excluded))]
  (when (not= comp-names portal)
    (fail! "components-are-exactly-the-in-portal-directories"
           (str (count (remove portal comp-names)) " component(s) name no in-portal directory "
                (pr-str (sort (remove portal comp-names)))
                " and " (count (remove comp-names portal)) " in-portal directory(ies) have no component "
                (pr-str (sort (remove comp-names portal))))))
  (when (seq (filter comp-names excl-names))
    (fail! "excluded-directories-have-no-component"
           (str "excluded from the portal yet listed as components: "
                (pr-str (sort (filter comp-names excl-names))))))
  (when (not= (count components) (count comp-names))
    (fail! "component-names-are-unique"
           (str (count components) " component entries but only " (count comp-names)
                " distinct component names")))
  ;; every component says which COFOG class it serves and what to call it
  (doseq [c components]
    (doseq [k [:code :component :title]]
      (when (str/blank? (str (get c k)))
        (fail! "components-carry-code-name-and-title"
               (str (pr-str (:component c)) " has a blank " (name k)))))))

;; ── 3. no two COFOG codes collapse to one registry key ──────────────────────
;;
;; kotoba/src/types.ts:
;;   cofogRkey(code) = `cofog-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
;; and registry.ts reads/writes every cofogService record at that rkey. Distinct
;; codes that differ only in case or punctuation address ONE record.

(defn- rkey [code]
  (str "cofog-" (-> (str code) str/lower-case (str/replace #"[^a-z0-9]+" "-"))))

(doseq [[label codes]
        [["cofog-components.json" (distinct (map :code components))]
         ["the summary's directories" (distinct (map :code directories))]]]
  (let [collisions (->> codes
                        (group-by rkey)
                        (filter #(> (count (val %)) 1)))]
    (when (seq collisions)
      (fail! "cofog-rkey-is-injective-over-the-codes-in-the-artifacts"
             (str label " carries codes that share a registry key — the second"
                  " registerCofog would return alreadyExists and be dropped: "
                  (pr-str (into (sorted-map) (map (fn [[k v]] [k (vec (sort v))]) collisions))))))))

;; ── 4. the prose still quotes these files correctly ─────────────────────────

(let [n         (str (:directories totals))
      generated (str (:generatedAt summary))
      day       (first (str/split generated #"T"))]
  (when (str/blank? generated)
    (fail! "summary-records-when-it-was-generated"
           (str summary-rel " has no generatedAt, so the prose calling it a"
                " frozen snapshot has no date to agree with")))
  (doseq [[rel text] [["README.md" readme]
                      ["docs/operator-quickstart.md" quickstart]]]
    (when-not (str/includes? text (str n " directories"))
      (fail! "prose-quotes-the-directory-count-in-the-artifact"
             (str rel " describes the frozen snapshot but does not say \""
                  n " directories\", which is what " summary-rel " now says")))
    (when-not (or (str/blank? day) (str/includes? text day))
      (fail! "prose-quotes-the-snapshot-date-in-the-artifact"
             (str rel " does not mention " day ", the generatedAt of " summary-rel)))))

;; ── report ──────────────────────────────────────────────────────────────────

(println (str "SCANNED\tdirectories=" (count directories)
              "\tgroups=" (count groups)
              "\tcomponents=" (count components)
              "\texcluded=" (count excluded)))

(if (seq @failures)
  (do (doseq [f @failures] (println f))
      (println (str "cofog-artifact-check: " (count @failures) " invariant(s) violated"))
      (js/process.exit 1))
  (do (println "cofog-artifact-check: OK")
      (js/process.exit 0)))
