'use client';
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ClientSelect, { AssignedClient, ClientOption, toClientOptions } from "./ClientSelect";
import toast from "react-hot-toast";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import {
  ASSISTANT_CLIENTS_ASSIGNED,
  ASSISTANT_VA_CLIENT_CVS,
  ASSISTANT_VA_CRITERIA,
  ASSISTANT_VA_CRITERIA_CLASSIFY,
  ASSISTANT_VA_JOB_AD,
} from "@/constants/apiEndpoints/admin.endpoint";

/*
 * PC (assistant) Customer mode — the Selection Criteria Assistant from
 * SPR-20-01-014 → 021: client → CV → job ad (link, with a paste fallback) →
 * selection-criteria questions → classified cards with candidate responses.
 * The PC reviews and pastes every response; nothing goes to an employer.
 */

type Cv = { id: string; name: string; status: string; isDefault: boolean; createdAt: string };
type ClassifiedQuestion = { question: string; classification: "public" | "private" };

type Candidate = { text: string; source: "db" | "ai-evidence" | "ai-intuition" };
type Result =
  | { type: "private"; question: string; template: { id: string; name: string } | null }
  | {
      type: "public";
      question: string;
      bank: "matched" | "pending" | "new";
      bankCode: string;
      evidence: { source: string; text: string }[];
      candidates: Candidate[];
    };

const apiMessage = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && (error.response?.data as { message?: string })?.message) || fallback;

const SOURCE_LABEL: Record<Candidate["source"], string> = {
  db: "DB · BEST-IN-CLASS",
  "ai-evidence": "AI · WITH EVIDENCE",
  "ai-intuition": "AI · INTUITION",
};

const BANK_PILL = {
  matched: { label: "MATCHED · SCQ BANK", className: "bg-[#E3F1FA] text-[#0B7FC4]" },
  new: { label: "NEW · ADDED AS DRAFT", className: "bg-[#F2EDFB] text-[#6D3EC2]" },
  pending: { label: "IN BANK · AWAITING REVIEW", className: "bg-[#FDF0DC] text-[#B5730A]" },
} as const;

const BANK_HINT = {
  matched: "From the Selection Criteria Questions FAQ category, plus AI-drafted alternates.",
  new: "No match — added to that FAQ category (status: Draft) for an admin to answer.",
  pending: "Already in the bank, waiting for an admin to answer and publish it.",
} as const;


const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-[3px] mt-[9px] block text-[9.5px] font-bold text-[#5B6B7C] first:mt-0">{children}</label>
);
const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-[3px] text-[9px] leading-snug text-[#8C99A6]">{children}</p>
);
const inputClass =
  "w-full rounded-md border border-[#DDE3EA] bg-white px-[9px] py-[7px] text-[11.5px] focus:border-[#0B7FC4] focus:outline-none disabled:bg-[#F7F8FA] disabled:text-[#8C99A6]";
const primaryBtn =
  "rounded-md bg-[#0B7FC4] px-[13px] py-[7px] text-[11px] font-bold text-white disabled:opacity-40";

interface AssistantCustomerFlowProps {
  /** The client whose page is open — fixed when present. */
  pageClient: ClientOption | null;
  pageClientId: string | null;
  sessionId: string;
  onBack: () => void;
}

export default function AssistantCustomerFlow({
  pageClient,
  pageClientId,
  sessionId,
  onBack,
}: AssistantCustomerFlowProps) {
  const [pickedClient, setPickedClient] = useState<ClientOption | null>(null);
  const client = pageClientId ? pageClient : pickedClient;

  const [cvId, setCvId] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobStage, setJobStage] = useState<"link" | "fetching" | "fetched" | "failed">("link");
  const [jobAdText, setJobAdText] = useState("");
  const [jobError, setJobError] = useState("");
  const [stage, setStage] = useState<"setup" | "criteria" | "classified" | "results">("setup");
  const [questions, setQuestions] = useState("");
  const [classified, setClassified] = useState<ClassifiedQuestion[]>([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [picked, setPicked] = useState<Record<number, number>>({});

  // Off a client page, the PC picks from the clients assigned to them.
  const assignedQuery = useFetchData<{ clientDetails: AssignedClient[] }>({
    method: "GET",
    url: ASSISTANT_CLIENTS_ASSIGNED,
    queryKey: ["assistant-clients-assigned"],
    enabled: !pageClientId,
  });
  const clientOptions = toClientOptions(assignedQuery.data?.data?.clientDetails);

  const cvsQuery = useFetchData<Cv[]>({
    method: "GET",
    url: client ? ASSISTANT_VA_CLIENT_CVS(client.value) : "",
    queryKey: ["va-client-cvs", client?.value ?? ""],
    enabled: !!client,
  });
  const cvs = useMemo(() => cvsQuery.data?.data ?? [], [cvsQuery.data]);

  // A different client starts the whole flow again.
  useEffect(() => {
    setCvId("");
    setJobUrl("");
    setJobStage("link");
    setJobAdText("");
    setJobError("");
    setStage("setup");
    setQuestions("");
    setClassified([]);
    setResults([]);
    setPicked({});
  }, [client?.value]);

  // Preselect the default (or newest) CV once the list loads.
  useEffect(() => {
    if (!cvId && cvs.length) setCvId(cvs[0].id);
  }, [cvs, cvId]);

  const jobAdReady = jobAdText.trim().length >= 50;

  const fetchJobAd = async () => {
    if (!jobUrl.trim()) return;
    setJobStage("fetching");
    setJobError("");
    try {
      const { data } = await axiosInstance.post(ASSISTANT_VA_JOB_AD, { url: jobUrl.trim() });
      const result = data?.data as { ok: boolean; text?: string; reason?: string };
      if (result?.ok && result.text) {
        setJobAdText(result.text);
        setJobStage("fetched");
      } else {
        setJobError(result?.reason || "The link couldn't be fetched. Paste the advertisement text instead.");
        setJobStage("failed");
      }
    } catch (error) {
      setJobError(apiMessage(error, "The link couldn't be fetched. Paste the advertisement text instead."));
      setJobStage("failed");
    }
  };

  // Step 1 — extract + classify only (no drafts, no FAQ writes, no routing).
  const extractAndClassify = async () => {
    if (!client || !questions.trim()) return;
    setRunning(true);
    try {
      const { data } = await axiosInstance.post(ASSISTANT_VA_CRITERIA_CLASSIFY, {
        clientId: client.value,
        questions,
      });
      setClassified(data?.data?.items ?? []);
      setStage("classified");
    } catch (error) {
      toast.error(apiMessage(error, "Couldn't extract the questions. Please try again."));
    } finally {
      setRunning(false);
    }
  };

  const toggleClassification = (index: number) =>
    setClassified((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, classification: item.classification === "private" ? "public" : "private" }
          : item,
      ),
    );

  const removeQuestion = (index: number) =>
    setClassified((prev) => prev.filter((_, i) => i !== index));

  // Step 2 — candidates for Public, Missing Info routing for Private, using
  // the labels the PC confirmed.
  const runAssistant = async () => {
    if (!client || !cvId || classified.length === 0) return;
    setRunning(true);
    try {
      const { data } = await axiosInstance.post(ASSISTANT_VA_CRITERIA, {
        clientId: client.value,
        uploadId: cvId,
        jobAdText,
        items: classified,
        sessionId,
      });
      setResults(data?.data?.results ?? []);
      setAiAvailable(data?.data?.aiAvailable !== false);
      setPicked({});
      setStage("results");
    } catch (error) {
      toast.error(apiMessage(error, "Couldn't process the selection criteria. Please try again."));
    } finally {
      setRunning(false);
    }
  };

  const pickCandidate = async (ri: number, ci: number, text: string) => {
    setPicked((prev) => ({ ...prev, [ri]: ci }));
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied — review it, then paste it into the application.");
    } catch {
      toast("Selected — copy it from the card.");
    }
  };

  const missingInfoHref = client ? `/pc/users/${encodeURIComponent(client.value)}?tab=missing-info` : "#";

  return (
    <div className="flex-1 overflow-y-auto px-[15px] pb-[14px] pt-1">
      <button type="button" onClick={onBack} className="block pb-[9px] text-[9.5px] text-[#5B6B7C] hover:text-[#0F2A47]">
        ← Customer
      </button>

      {/* 1. Client */}
      <Label>Client</Label>
      {pageClientId ? (
        pageClient ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-[#DDE3EA] bg-[#F7F8FA] px-2.5 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B7FC4] text-[11px] font-bold text-white">
              {pageClient.label
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-[#0F2A47]">{pageClient.label}</span>
              <span className="block text-[10px] text-[#5B6B7C]">Client ID {pageClientId}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border border-[#DDE3EA] bg-[#F7F8FA] px-2.5 py-2">
            <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[#DDE3EA]" />
            <span className="flex-1 space-y-1.5">
              <span className="block h-2.5 w-2/3 animate-pulse rounded bg-[#DDE3EA]" />
              <span className="block h-2 w-1/3 animate-pulse rounded bg-[#DDE3EA]" />
            </span>
          </div>
        )
      ) : (
        <ClientSelect
          value={pickedClient}
          options={clientOptions}
          isLoading={assignedQuery.isLoading}
          onChange={setPickedClient}
          placeholder="Search your clients…"
        />
      )}
      <Hint>
        {pageClientId
          ? "Taken from the profile you have open."
          : "Only clients assigned to you are listed."}
      </Hint>

      {/* 2. CV */}
      {client && (
        <>
          <Label>Client CV / résumé</Label>
          {cvsQuery.isLoading ? (
            <div className={inputClass}>Loading CVs…</div>
          ) : cvsQuery.isError ? (
            <p className="text-[10.5px] text-[#C4331F]">{cvsQuery.error?.message || "Couldn't load this client's CVs."}</p>
          ) : cvs.length === 0 ? (
            <p className="text-[10.5px] text-[#C4331F]">No CV on file for this client.</p>
          ) : (
            <select className={inputClass} value={cvId} onChange={(e) => setCvId(e.target.value)} disabled={stage !== "setup"}>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                  {cv.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      {/* 3. Job ad — link first, paste fallback */}
      {client && cvId && (
        <>
          <Label>Paste a job link</Label>
          <div className="flex gap-1.5">
            <input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://…"
              className={inputClass}
              disabled={stage !== "setup" || jobStage === "fetching"}
              onKeyDown={(e) => e.key === "Enter" && void fetchJobAd()}
            />
            {stage === "setup" && (
              <button
                type="button"
                className={primaryBtn}
                disabled={!jobUrl.trim() || jobStage === "fetching"}
                onClick={() => void fetchJobAd()}
              >
                {jobStage === "fetching" ? "…" : "Fetch"}
              </button>
            )}
          </div>
          {jobStage === "fetched" ? (
            <Hint>
              <span className="font-semibold text-[#146C40]">✓ Job ad fetched ({jobAdText.length.toLocaleString()} characters).</span>
            </Hint>
          ) : jobStage === "failed" ? (
            <>
              <Hint>{jobError}</Hint>
              <Label>Paste the job advertisement content</Label>
              <textarea
                value={jobAdText}
                onChange={(e) => setJobAdText(e.target.value)}
                placeholder="Paste the full body of the ad here…"
                className={`${inputClass} min-h-[70px] resize-y`}
                disabled={stage !== "setup"}
              />
              <Hint>Shown when the link can&apos;t be retrieved — you&apos;re never blocked.</Hint>
            </>
          ) : (
            <Hint>
              Fetches and reads the ad automatically.{" "}
              <button type="button" className="text-[#0B7FC4] hover:underline" onClick={() => setJobStage("failed")}>
                Paste the ad text instead
              </button>
            </Hint>
          )}

          {stage === "setup" && (
            <div className="mt-[9px]">
              <button type="button" className={primaryBtn} disabled={!jobAdReady} onClick={() => setStage("criteria")}>
                Continue to selection criteria →
              </button>
            </div>
          )}
        </>
      )}

      {/* 4. Criteria */}
      {stage === "criteria" && (
        <>
          <Label>Paste the selection-criteria questions</Label>
          <textarea
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder="Paste the questions — one per line, numbered, or several in a paragraph…"
            className={`${inputClass} min-h-[90px] resize-y`}
            disabled={running}
          />
          <Hint>Each question is pulled out separately; numbering and bullets are ignored. Up to 15.</Hint>
          <div className="mt-[9px] flex items-center gap-2">
            <button
              type="button"
              className={primaryBtn}
              disabled={!questions.trim() || running}
              onClick={() => void extractAndClassify()}
            >
              {running ? "Extracting…" : "Extract & classify"}
            </button>
            {!running && (
              <button type="button" className="text-[10px] text-[#5B6B7C] hover:text-[#0F2A47]" onClick={() => setStage("setup")}>
                Change job ad
              </button>
            )}
          </div>
        </>
      )}

      {/* 4b. Review the classification before anything fires */}
      {stage === "classified" && (
        <>
          <Label>
            {classified.length} question{classified.length === 1 ? "" : "s"} extracted — check each classification
          </Label>
          <Hint>
            Public questions get candidate responses. Private ones (visa, work rights, certifications…) are never
            drafted and go to Missing Information. Nothing has run yet.
          </Hint>

          {classified.map((item, index) => {
            const isPrivateItem = item.classification === "private";
            return (
              <div key={`${index}-${item.question}`} className="mt-1.5 rounded-[7px] border border-[#DDE3EA] bg-white px-[9px] py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold ${
                      isPrivateItem ? "bg-[#FBE6E2] text-[#C4331F]" : "bg-[#E3F1FA] text-[#0B7FC4]"
                    }`}
                  >
                    {isPrivateItem ? "PRIVATE" : "PUBLIC"}
                  </span>
                  <span className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => toggleClassification(index)}
                      className="text-[9px] font-bold text-[#0B7FC4] hover:underline disabled:opacity-40"
                    >
                      Mark {isPrivateItem ? "public" : "private"}
                    </button>
                    <button
                      type="button"
                      aria-label="Remove question"
                      disabled={running}
                      onClick={() => removeQuestion(index)}
                      className="text-[11px] text-[#8C99A6] hover:text-[#C4331F] disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </span>
                </div>
                <p className="text-[10.5px] leading-snug text-[#16232F]">{item.question}</p>
              </div>
            );
          })}

          <div className="mt-[9px] flex items-center gap-2">
            <button
              type="button"
              className={primaryBtn}
              disabled={classified.length === 0 || running}
              onClick={() => void runAssistant()}
            >
              {running ? "Generating…" : "Generate responses →"}
            </button>
            {!running && (
              <button type="button" className="text-[10px] text-[#5B6B7C] hover:text-[#0F2A47]" onClick={() => setStage("criteria")}>
                ← Edit questions
              </button>
            )}
          </div>
        </>
      )}

      {/* 5. Results */}
      {stage === "results" && (
        <>
          {!aiAvailable && (
            <div className="mt-[9px] rounded-r-[5px] border-l-[3px] border-[#B5730A] bg-[#FDF0DC] px-2 py-1.5 text-[10px] text-[#B5730A]">
              <b className="block">AI drafts unavailable right now</b>
              Showing bank answers only. Try again in a moment.
            </div>
          )}

          {results.map((r, ri) =>
            r.type === "private" ? (
              <div key={ri} className="mt-[9px] rounded-lg border border-[#DDE3EA] bg-white px-2.5 py-[9px]">
                <span className="mb-[5px] inline-block rounded px-1.5 py-0.5 text-[8px] font-extrabold bg-[#FBE6E2] text-[#C4331F]">
                  PRIVATE — ROUTE TO MISSING INFO
                </span>
                <p className="mb-[5px] text-[11px] font-bold">{r.question}</p>
                <div className="rounded-r-[5px] border-l-[3px] border-[#C4331F] bg-[#FBE6E2] px-2 py-1.5 text-[10px] text-[#C4331F]">
                  <b className="block">Not on file for this client</b>
                  Not drafted — this has to come from the client. No guess made.
                </div>
                <p className="mt-[5px] flex items-center gap-[5px] text-[9.5px] text-[#5B6B7C]">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#B5730A]" />
                  {r.template
                    ? `Matches the "${r.template.name}" template — ask an admin to send it.`
                    : "No template exists yet — ask an admin to create and send one."}
                </p>
                <a
                  href={missingInfoHref}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#CFE9F8] bg-[#EAF5FC] px-2 py-[5px] text-[9.5px] font-bold text-[#0B7FC4] hover:bg-[#DDF0FB]"
                >
                  🔗 Open Missing Information →
                </a>
              </div>
            ) : (
              <div key={ri} className="mt-[9px] rounded-lg border border-[#DDE3EA] bg-white px-2.5 py-[9px]">
                <span className={`mb-[5px] inline-block rounded px-1.5 py-0.5 text-[8px] font-extrabold ${BANK_PILL[r.bank].className}`}>
                  {BANK_PILL[r.bank].label}
                </span>
                <p className="mb-[5px] text-[11px] font-bold">{r.question}</p>
                <Hint>
                  {BANK_HINT[r.bank]}
                  {r.bankCode ? ` (${r.bankCode})` : ""}
                </Hint>

                {r.evidence.map((e, ei) => (
                  <div key={ei} className="mt-[5px] rounded-r-[5px] border-l-[3px] border-[#1D9A5C] bg-[#F8FBF8] px-[7px] py-[5px] text-[9.5px]">
                    <span className="mb-px block text-[8px] font-extrabold text-[#146C40]">{e.source}</span>
                    {e.text}
                  </div>
                ))}

                {r.candidates.length ? (
                  <>
                    <p className="mb-px mt-[7px] text-[9px] text-[#8C99A6]">
                      {r.candidates.length} candidate response{r.candidates.length === 1 ? "" : "s"} — pick one to paste in:
                    </p>
                    {r.candidates.map((c, ci) => {
                      const isPicked = picked[ri] === ci;
                      return (
                        <button
                          key={ci}
                          type="button"
                          onClick={() => void pickCandidate(ri, ci, c.text)}
                          className={`mt-1.5 block w-full rounded-[7px] border px-[9px] py-2 text-left transition-colors ${
                            isPicked ? "border-[#1D9A5C] bg-[#E7F7EE]" : "border-[#DDE3EA] bg-white hover:border-[#0B7FC4]"
                          }`}
                        >
                          <span className="mb-[3px] flex items-center justify-between">
                            <span className={`text-[8.5px] font-extrabold ${isPicked ? "text-[#146C40]" : "text-[#8C99A6]"}`}>
                              {SOURCE_LABEL[c.source]}
                              {c.source === "ai-intuition" && (
                                <span className="ml-[5px] rounded bg-[#FDF0DC] px-[5px] py-px text-[8px] text-[#B5730A]">UNVERIFIED</span>
                              )}
                            </span>
                            <span className={`text-[9px] font-extrabold ${isPicked ? "text-[#146C40]" : "text-[#0B7FC4]"}`}>
                              {isPicked ? "✓ Selected" : "Use this →"}
                            </span>
                          </span>
                          <span className="block whitespace-pre-line text-[10.5px] leading-snug">{c.text}</span>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <Hint>No candidate responses yet.</Hint>
                )}
              </div>
            ),
          )}

          <div className="mt-2.5 rounded-r-[5px] border-l-[3px] border-[#6D3EC2] bg-[#F2EDFB] px-[9px] py-[7px] text-[10px] text-[#4A2E86]">
            <b className="block">PC reviews every draft</b>
            Nothing submits to the employer directly — pick, edit, and paste a response in.
          </div>
          <div className="mt-2.5">
            <button type="button" className="text-[10px] font-semibold text-[#0B7FC4] hover:underline" onClick={() => setStage("criteria")}>
              ← Edit questions
            </button>
          </div>
        </>
      )}
    </div>
  );
}
