'use client';

import React, { useEffect, useState, useMemo } from 'react';
import axiosInstance from '@/services/api-client';
import toast from 'react-hot-toast';

interface UpdateJobStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  initialStatus?: string;
  rowData?: any;
  onUpdated?: () => Promise<void> | void;
}

const HQA_REASON = 'Matches all client criteria';
const PARAMS = ['Role', 'Location', 'Salary', 'Work rights', 'Industry'];
const P_MAP: Record<string, string> = {
  'Salary range requires verification': 'Salary',
  'Salary below client\'s stated minimum': 'Salary',
  'Location requires confirmation': 'Location',
  'Location outside client\'s stated preference': 'Location',
  'Role scope requires clarification': 'Role',
  'Role misaligned with client profile': 'Role',
  'Industry alignment requires review': 'Industry',
  'Industry outside client\'s target sector': 'Industry',
  'Work rights eligibility unconfirmed': 'Work rights',
  'Client ineligible — work rights / sponsorship required': 'Work rights',
};
const R_LQA = [
  'Role misaligned with client profile',
  'Location outside client\'s stated preference',
  'Salary below client\'s stated minimum',
  'Client ineligible — work rights / sponsorship required',
  'Industry outside client\'s target sector',
  'Job posting materially incomplete',
  'Other',
];
const R_MQA = [
  'Salary range requires verification',
  'Location requires confirmation',
  'Role scope requires clarification',
  'Industry alignment requires review',
  'Work rights eligibility unconfirmed',
  'Posting incomplete — material fields absent',
  'Other',
];
const R_BLOCK = [
  'Pre-Flight Audit failed — CV non-compliant',
  'Client jobsite credentials not active',
  'Job portal inaccessible — SEEK 24-hour login rule',
  'Jobsite technical fault — retry required',
];
const R_SKIP = [
  'Position filled',
  'Vacancy withdrawn / no longer advertised',
  'Application channel unsupported',
  'Duplicate — application already submitted',
  'Other',
];
const R_PEND = [
  'Contact number missing or unverified',
  'Work rights status unconfirmed',
  'Visa status / sponsorship requirement unconfirmed',
  'Salary expectation not on record',
  'Notice period / availability not on record',
  'Years of experience not on record',
  'Licence / certification / registration not on file',
  'Other mandatory field required by the application form',
];
const R_RET = [
  'Terminal site not resolved — link routes onward to another site',
  'Terminal URL recorded is an aggregator, not the employer application page',
  'Discovery data error — client, role title or salary incorrect',
];
const R_EXP = [
  'Vacancy withdrawn by advertiser',
  'Job link unavailable (404)',
];
const R_DECLINE = [
  'Below submission standard — client criteria not sufficiently met',
  'Salary shortfall material — not in the client\'s interest',
  'Location outside acceptable range for this client',
  'Work rights / eligibility risk',
  'Industry outside the client\'s target sector',
  'Role seniority mismatch',
  'Client application volume sufficient — marginal vacancy not warranted',
  'Vetting assessment not supported by the evidence',
  'Other',
];

const tabs = [
  { key: 'disc', label: 'Returns' },
  { key: 'vet', label: 'Vetting' },
  { key: 'sub', label: 'Submission' },
  { key: 'hold', label: 'Hold & Return' },
  { key: 'app', label: 'MQA Approval' },
] as const;

type TabKey = typeof tabs[number]['key'];

function parseHyperlink(value: string | undefined | null): { url: string; label: string } | null {
  if (!value) return null;
  const m = value.match(/=HYPERLINK\("([^"]+)","([^"]+)"\)/i);
  return m ? { url: m[1], label: m[2] } : null;
}

const UpdateJobStatusModal: React.FC<UpdateJobStatusModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  initialStatus = 'Unattended',
  rowData,
  onUpdated,
}) => {
  const stLower = initialStatus.toLowerCase().replace(/_/g, ' ');
  const quality = (rowData?.Quality_Score || '').toUpperCase();
  const isVettedMqa = stLower === 'vetted' && quality === 'MQA';
  const isReturned = stLower === 'returned to discovery';
  const isVetted = stLower === 'vetted';

  const defaultTab = isReturned ? 'disc' : isVettedMqa ? 'app' : isVetted ? 'sub' : 'vet';

  const [tab, setTab] = useState<TabKey>(defaultTab);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [approveAction, setApproveAction] = useState<'ok' | 'no' | ''>('');
  const [correctedLink, setCorrectedLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const entry = rowData || {};
  const hl = parseHyperlink(entry.Job_Title);
  const jobLabel = hl?.label || entry.Job_Title || '';
  const clientName = entry.Client || '';
  const location = entry.Job_Location || '';
  const advertiser = entry.Advertiser || '';
  const vettedBy = entry.Vetted_By || '';
  const reasonStr = entry.Status_Reason || '';
  const appCount = parseInt(entry.app_count || entry.total_applications || '0', 10);
  const ageMins = entry.age_minutes || 0;

  const flaggedParams = useMemo(() => {
    return reasonStr.split(';').flatMap((r: string) => {
      const p = P_MAP[r.trim()];
      return p ? [p] : [];
    });
  }, [reasonStr]);

  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
      setSelectedStatus('');
      setSelectedQuality('');
      setReasons([]);
      setCustomReason('');
      setApproveAction('');
      setCorrectedLink('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const toggleReason = (r: string) => {
    setReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    if (r === 'Other') setCustomReason('');
  };

  const resetTabState = (t: TabKey) => {
    setTab(t);
    setSelectedStatus('');
    setSelectedQuality('');
    setReasons([]);
    setCustomReason('');
    setApproveAction('');
    setCorrectedLink('');
  };

  const isTabEnabled = (k: TabKey): boolean => {
    if (k === 'disc') return isReturned;
    if (k === 'app') return isVettedMqa;
    return true;
  };

  const reasonList = (): { list: string[]; multi: boolean; label: string } | null => {
    const t = tab;
    if (t === 'vet' && selectedQuality === 'MQA') return { list: R_MQA, multi: true, label: 'Parameters requiring verification' };
    if (t === 'vet' && selectedQuality === 'LQA') return { list: R_LQA, multi: true, label: 'Grounds for rejection' };
    if (t === 'sub' && selectedStatus === 'Blocked') return { list: R_BLOCK, multi: false, label: 'What is blocking you' };
    if (t === 'sub' && selectedStatus === 'Pending') return { list: R_PEND, multi: true, label: 'Data required by the application form' };
    if (t === 'sub' && selectedStatus === 'Skipped') return { list: R_SKIP, multi: false, label: 'Reason' };
    if (t === 'hold' && selectedStatus === 'Pending') return { list: R_PEND, multi: true, label: 'Data required' };
    if (t === 'hold' && selectedStatus === 'Returned to Discovery') return { list: R_RET, multi: false, label: 'Reason for return' };
    if (t === 'hold' && selectedStatus === 'Expired') return { list: R_EXP, multi: false, label: 'Reason' };
    if (t === 'app' && approveAction === 'no') return { list: R_DECLINE, multi: true, label: 'Grounds for declining' };
    return null;
  };

  const rl = reasonList();
  const otherSelected = reasons.includes('Other');
  const mqaOver3 = tab === 'vet' && selectedQuality === 'MQA' && reasons.filter(x => x !== 'Other').length > 2;
  const slaColor: [string, string, string] = ageMins >= 60 ? ['#FEE2E2', '#A12222', 'SLA BREACHED'] : ageMins >= 30 ? ['#FEF3C7', '#8A5A06', 'RE-TAG DUE'] : ['#DCFCE7', '#166534', ''];

  const isValid = (): boolean => {
    if (tab === 'disc') return !!correctedLink.trim();
    if (tab === 'app') {
      if (approveAction === 'ok') return true;
      if (approveAction !== 'no') return false;
      if (!reasons.length) return false;
      if (otherSelected && !customReason.trim()) return false;
      return true;
    }
    if (tab === 'vet') {
      if (!selectedQuality) return false;
      if (selectedQuality === 'HQA') return true;
      if (!rl) return !selectedQuality ? false : true;
      if (!reasons.length) return false;
      if (otherSelected && !customReason.trim()) return false;
      return true;
    }
    if (!selectedStatus) return false;
    if (rl && !reasons.length) return false;
    if (otherSelected && !customReason.trim()) return false;
    return true;
  };

  const handleConfirm = async () => {
    if (!applicationId) { toast.error('Application id is missing.'); return; }
    if (!isValid()) { toast.error('Please complete all required fields.'); return; }

    const allReasons = reasons.filter(r => r !== 'Other');
    if (reasons.includes('Other') && customReason.trim()) allReasons.push(customReason.trim());
    const reasonStr = allReasons.join('; ');

    let payload: Record<string, any> = { applicationId };

    if (tab === 'disc') {
      payload.status = 'UNATTENDED';
      payload.correctedJobLink = correctedLink.trim();
      if (reasonStr) payload.StatusReason = reasonStr;
    } else if (tab === 'vet') {
      if (selectedQuality === 'LQA') {
        payload.status = 'SKIPPED';
        payload.qualityScore = 'LQA';
        payload.StatusReason = reasonStr || 'LQA';
      } else {
        payload.status = 'VETTED';
        payload.qualityScore = selectedQuality;
        if (selectedQuality === 'HQA') {
          payload.StatusReason = HQA_REASON;
        } else {
          payload.StatusReason = reasonStr || selectedQuality;
        }
      }
    } else if (tab === 'sub') {
      if (selectedStatus === 'Submitted') {
        payload.status = 'SUBMITTED';
      } else if (selectedStatus === 'Blocked') {
        payload.status = 'BLOCKED';
        payload.StatusReason = reasonStr;
      } else if (selectedStatus === 'Pending') {
        payload.status = 'PENDING';
        payload.StatusReason = reasonStr;
      } else if (selectedStatus === 'Skipped') {
        payload.status = 'SKIPPED';
        payload.StatusReason = reasonStr;
      }
    } else if (tab === 'hold') {
      if (selectedStatus === 'Pending') {
        payload.status = 'PENDING';
        payload.StatusReason = reasonStr;
      } else if (selectedStatus === 'Returned to Discovery') {
        payload.status = 'RETURNED_TO_DISCOVERY';
        payload.StatusReason = reasonStr;
      } else if (selectedStatus === 'Expired') {
        payload.status = 'EXPIRED';
        payload.StatusReason = reasonStr;
      }
    } else if (tab === 'app') {
      if (approveAction === 'ok') {
        payload.status = 'VETTED';
        payload.qualityScore = 'HQA';
        payload.action = 'approve';
        payload.StatusReason = HQA_REASON + ' — MQA approved by Assurance';
      } else {
        payload.status = 'DECLINED';
        payload.declined_reasons = allReasons;
        payload.StatusReason = reasonStr;
      }
    }

    try {
      setIsSubmitting(true);
      const response = await axiosInstance.post(
        '/api/v1/campaigns/clients/applications/update-status',
        payload
      );
      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to update status');
      }
      toast.success(response.data?.message || 'Application status updated successfully');
      await onUpdated?.();
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const confirmLabel = tab === 'app' ? (approveAction === 'no' ? 'Decline' : 'Approve') : 'Confirm';
  const confirmBtnClass = tab === 'app' && approveAction === 'no' ? '#E5484D' : tab === 'app' ? '#22B14C' : '#2196D8';

  const renderTabContent = () => {
    const lbl = (text: string, req?: boolean) => (
      <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>
        {text}{req && <span style={{ color: '#E5484D' }}> *</span>}
      </label>
    );
    const hint = (msg: string, variant: 'bad' | 'warn' | 'good' | 'info') => {
      const map = {
        bad: { bg: '#FEF2F2', color: '#A12222' },
        warn: { bg: '#FFFBEB', color: '#8A5A06' },
        good: { bg: '#F4FCF6', color: '#166534' },
        info: { bg: '#F6F8FA', color: '#6B7280' },
      };
      const s = map[variant];
      return (
        <div className="mt-2 p-[9px] text-[11.5px] leading-relaxed" style={{ background: s.bg, color: s.color, borderRadius: '7px' }} dangerouslySetInnerHTML={{ __html: msg }}>
        </div>
      );
    };
    const optsBtn = (label: string, selected: boolean, blockDesc?: string, onClick?: () => void) => (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-start justify-between text-left text-[13px] transition-colors ${
          selected ? 'font-semibold' : ''
        }`}
        style={{
          padding: '12px 14px',
          border: 0,
          borderBottom: '1px solid #F0F2F5',
          background: selected ? '#F0F9FF' : '#fff',
          color: '#1F2937',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F6F8FA'; }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = '#fff'; }}
      >
        <span>
          <b>{label}</b>
          {blockDesc && <span className="block text-[11px] font-normal mt-0.5" style={{ color: '#6B7280' }}>{blockDesc}</span>}
        </span>
        <span className="mt-0.5">{selected ? '✓' : ''}</span>
      </button>
    );

    if (tab === 'disc') {
      return (
        <div className="space-y-[15px]">
          <div className="p-[9px] text-[11.5px] leading-relaxed" style={{ background: '#FEF2F2', color: '#A12222', borderRadius: '7px' }}>
            <b>Returned by {vettedBy || 'VPC'}</b><br />{reasonStr || 'Entry returned to Discovery'}
          </div>
          <div>
            {lbl('Corrected job link', true)}
            <input
              type="text" value={correctedLink}
              onChange={e => setCorrectedLink(e.target.value)}
              placeholder="Paste the link the application is actually made on"
              className="w-full px-3 py-[11px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2196D8]"
              style={{ border: '1px solid #E2E6EA', borderRadius: '8px' }}
            />
          </div>
          {correctedLink.trim() && hint(
            '<b>On save the status returns to Unattended</b> and the entry re-enters the vetting queue. <b>Same entry, same ID</b> — it was never a new job.',
            'good'
          )}
        </div>
      );
    }

    if (tab === 'vet') {
      return (
        <div className="space-y-[15px]">
          <div>
            {lbl('Quality score', true)}
            <div style={{ border: '1px solid #E2E6EA', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ borderBottom: '1px solid #F0F2F5' }}>
                {optsBtn(
                  'Vetted',
                  (selectedQuality && selectedQuality !== 'LQA') || !selectedQuality,
                  undefined,
                  () => { setSelectedQuality(''); setReasons([]); setCustomReason(''); }
                )}
                <div className="flex gap-[6px] px-[14px] pb-3" style={{ background: '#F0F9FF' }}>
                  {(['HQA', 'MQA', 'LQA'] as const).map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setSelectedQuality(q); setReasons([]); setCustomReason(''); }}
                      className="rounded-md px-[13px] py-[5px] text-[10.5px] font-bold text-white border-0 transition-all"
                      style={{
                        opacity: selectedQuality === q ? '1' : '0.4',
                        transform: selectedQuality === q ? 'scale(1.06)' : 'none',
                        background: q === 'HQA' ? '#2BC07A' : q === 'MQA' ? '#F5A623' : '#E64545',
                        cursor: 'pointer',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {selectedQuality === 'HQA' && (
              <div className="mt-[15px]">
                <div className="p-[13px] text-[12.5px] leading-relaxed" style={{ background: '#F4FCF6', border: '1px solid #BBF7D0', borderRadius: '8px', fontWeight: 600, color: '#166534', position: 'relative' }}>
                  ✓ {HQA_REASON}
                </div>
                {hint(
                  '<b>Set automatically. 5/5 on every parameter.</b> Released directly to the Submission queue with no approval gate. <b>The reason column is never blank</b> — a Status Reason of "N/A" on the happy path makes the whole column unreadable as a record.',
                  'good'
                )}
              </div>
            )}
            {selectedQuality === 'LQA' && hint(
              '<b>LQA cannot be Vetted. Status set to Skipped.</b> LQA is a <b>quality score</b> recorded against a skipped entry — never a vetted status, and never visible in the Submission queue. <b>Select the grounds below — they are recorded as the Status Reason.</b>',
              'bad'
            )}
            {selectedQuality === 'MQA' && hint(
              '<b>MQA is referred to the Assurance Controller.</b> Not submittable until approved.',
              'warn'
            )}
          </div>
        </div>
      );
    }

    if (tab === 'sub') {
      const outcomes: { status: string; label: string; blockDesc?: string }[] = [
        { status: 'Submitted', label: 'Submitted — application completed' },
        { status: 'Blocked', label: 'Blocked — cannot submit right now',
          blockDesc: 'The job is fine. Something on our side stops us — a bad CV, a dead credential, a portal we cannot get into. It comes back.' },
        { status: 'Pending', label: 'Pending — client data required',
          blockDesc: 'The application form asks something we do not hold — right to work, notice period, phone number. It comes back.' },
        { status: 'Skipped', label: 'Skipped — the vacancy is gone',
          blockDesc: 'Filled, withdrawn, duplicate. Terminal — this one is a real skip.' },
      ];
      return (
        <div className="space-y-[15px]">
          <div>
            {lbl('Outcome', true)}
            <div style={{ border: '1px solid #E2E6EA', borderRadius: '8px', overflow: 'hidden' }}>
              {outcomes.map(({ status, label, blockDesc }) => optsBtn(
                label,
                selectedStatus === status,
                blockDesc,
                () => { setSelectedStatus(status); setReasons([]); setCustomReason(''); }
              ))}
            </div>
            {selectedStatus === 'Blocked' && hint(
              '<b>Nothing is submitted.</b> Escalated to the Assurance Controller. The entry returns to your queue the moment it is cleared — <b>it is not a skip and it must never be counted as one.</b>',
              'warn'
            )}
            {selectedStatus === 'Pending' && hint(
              '<b>Parked, not terminated.</b> The Assurance Controller issues the Missing Information request. The entry returns to <b>your</b> queue once the client replies.',
              'good'
            )}
            {selectedStatus === 'Skipped' && hint(
              '<b>Terminal — the entry dies here.</b> Only use this when the <b>vacancy itself</b> is gone. If the problem is on our side, it is <b>Blocked</b>, not Skipped.',
              'bad'
            )}
            {hint(
              '<b>Submission does not score.</b> No quality chips on this tab — classification is reserved to the Vetting Controller. The Submission Controller records only what happened when they tried to submit.',
              'info'
            )}
          </div>
        </div>
      );
    }

    if (tab === 'hold') {
      const outcomes: { status: string; label: string; blockDesc?: string }[] = [
        { status: 'Pending', label: 'Pending', blockDesc: 'Client data required — parked pending a Missing Information request' },
        { status: 'Returned to Discovery', label: 'Returned to Discovery', blockDesc: 'Terminal site not resolved, or a discovery data error — the entry remains open' },
        { status: 'Expired', label: 'Expired', blockDesc: 'Vacancy withdrawn or link unavailable — terminal' },
      ];
      return (
        <div className="space-y-[15px]">
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>
              Outcome <span style={{ color: '#E5484D' }}>*</span>
              <span className="text-[11.5px] font-normal" style={{ color: '#6B7280' }}> — the entry is not terminated</span>
            </label>
            <div style={{ border: '1px solid #E2E6EA', borderRadius: '8px', overflow: 'hidden' }}>
              {outcomes.map(({ status, label, blockDesc }) => optsBtn(
                label,
                selectedStatus === status,
                blockDesc,
                () => { setSelectedStatus(status); setReasons([]); setCustomReason(''); }
              ))}
            </div>
            {selectedStatus === 'Pending' && hint(
              '<b>Parked, not terminated.</b> The Assurance Controller issues the Missing Information request. The entry returns once the client responds.',
              'good'
            )}
            {selectedStatus === 'Returned to Discovery' && hint(
              '<b>The entry remains open.</b> It is not skipped and is not counted as a skip. Discovery corrects it and it returns to the vetting queue.',
              'good'
            )}
          </div>
        </div>
      );
    }

    if (tab === 'app') {
      const volHigh = appCount > 25;
      return (
        <div className="space-y-[15px]">
          <div>
            <div className="p-[13px] text-[12.5px] leading-relaxed" style={{ background: '#F6F8FA', border: '1px solid #E2E6EA', borderRadius: '8px', position: 'relative' }}>
              <b>{jobLabel || applicationId.slice(0, 8)}</b>
              {slaColor[2] && (
                <span className="absolute top-[10px] right-[11px] rounded-md px-[7px] py-[3px] text-[9.5px] font-bold whitespace-nowrap" style={{ background: slaColor[0], color: slaColor[1] }}>
                  {ageMins}m{slaColor[2] ? ' · ' + slaColor[2] : ''}
                </span>
              )}
              <br />{clientName} · {location}
              <br /><span className="text-[11.5px]" style={{ color: '#6B7280' }}>Vetted by {vettedBy || 'N/A'}</span>
              <div className="mt-[10px] flex flex-wrap gap-[5px]">
                {PARAMS.map(p => {
                  const bad = flaggedParams.includes(p);
                  return (
                    <span
                      key={p}
                      className="rounded px-[8px] py-[4px] text-[10px]"
                      style={{
                        background: bad ? '#FEE2E2' : '#DCFCE7',
                        color: bad ? '#A12222' : '#166534',
                        fontWeight: bad ? '700' : '500',
                      }}
                    >
                      {bad ? '✕' : '✓'} {p}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="mt-[9px] p-[10px] text-[12.5px]" style={{ borderLeft: '3px solid #F5A623', background: '#FFF9EE', borderRadius: '0 7px 7px 0' }}>
              <span className="mb-[3px] block text-[10.5px]" style={{ color: '#9CA3AF' }}>Vetting Controller — {vettedBy || 'N/A'}</span>
              {reasonStr}
            </div>
            <div
              className="mt-[9px] p-[9px] text-[11.5px]"
              style={{
                background: volHigh ? '#FEF2F2' : '#F6F8FA',
                color: volHigh ? '#A12222' : '#6B7280',
                borderRadius: '7px',
              }}
            >
              {volHigh ? '⚠ ' : ''}<b>{appCount}</b> applications already submitted for {clientName} this campaign
              {volHigh
                ? ' — a marginal job carries far less weight here than for a client with four.'
                : ' — few applications submitted. A marginal job carries more weight for this client.'}
            </div>
          </div>
          <div>
            {lbl('Decision', true)}
            <div style={{ border: '1px solid #E2E6EA', borderRadius: '8px', overflow: 'hidden' }}>
              {optsBtn(
                'Approve — release for submission',
                approveAction === 'ok',
                undefined,
                () => { setApproveAction('ok'); setReasons([]); setCustomReason(''); }
              )}
              {optsBtn(
                'Decline — not approved for submission',
                approveAction === 'no',
                undefined,
                () => { setApproveAction('no'); setReasons([]); setCustomReason(''); }
              )}
            </div>
            {approveAction === 'ok' && hint(
              'Approver name and timestamp are recorded against the entry. Score is promoted to <b>HQA-Approved</b> and the job enters the Submission queue.',
              'good'
            )}
            {approveAction === 'no' && hint(
              '<b>Declined is LOCKED and terminal.</b> The entry cannot be submitted, cannot be re-vetted, and does not return to the queue. <b>The quality score stays MQA</b> — that was the Vetting Controller\'s assessment and it stands on the record. Declining says <i>the Assurance Controller disagreed</i>, not <i>the Vetting Controller scored it LQA</i>.',
              'bad'
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,41,59,0.45)' }}>
      <div className="flex w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-2xl" style={{ maxHeight: '92vh', borderRadius: '14px' }}>
        {/* Modal Header */}
        <div className="px-[26px] pt-5 pb-0 text-center">
          <h3 className="text-[17px] font-bold m-0 mb-[3px]" style={{ color: '#1F2937' }}>Update Status</h3>
          <p className="text-[11.5px] m-0 mb-[14px]" style={{ color: '#6B7280' }}>{jobLabel || 'Job'} &middot; {clientName || 'N/A'}</p>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-[18px]" style={{ borderBottom: '1px solid #E2E6EA', scrollbarWidth: 'none' }}>
          {tabs.map(({ key, label }) => {
            const enabled = isTabEnabled(key);
            const hasDot = (key === 'app' && isVettedMqa) || (key === 'disc' && isReturned);
            return (
              <button
                key={key}
                type="button"
                disabled={!enabled}
                onClick={() => resetTabState(key)}
                className={`whitespace-nowrap px-[10px] py-[10px] text-[11.5px] font-semibold transition-colors ${
                  tab === key
                    ? 'text-[#2196D8]'
                    : enabled
                      ? 'hover:text-[#1F2937]'
                      : 'cursor-not-allowed'
                }`}
                style={{
                  background: 'none',
                  border: 0,
                  borderBottom: tab === key ? '2px solid #2196D8' : '2px solid transparent',
                  marginBottom: '-1px',
                  color: !enabled ? '#9CA3AF' : tab === key ? '#2196D8' : '#6B7280',
                }}
              >
                {label}
                {hasDot && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#F5A623]" />}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-[26px] py-[18px]">
          {renderTabContent()}

          {rl && (
            <div className="mt-[15px]">
              <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>
                {rl.label} <span style={{ color: '#E5484D' }}>*</span>{rl.multi && <span className="text-[11.5px] font-normal" style={{ color: '#6B7280' }}> — select all that apply</span>}
              </label>
              <div className="max-h-48 overflow-y-auto" style={{ border: '1px solid #E2E6EA', borderRadius: '8px' }}>
                {rl.list.map(r => {
                  const on = reasons.includes(r);
                  return (
                    <label
                      key={r}
                      className={`flex cursor-pointer items-center gap-[9px] px-3 py-[9px] text-xs transition-colors last:border-b-0 ${
                        on ? 'font-semibold' : ''
                      }`}
                      style={{
                        borderBottom: '1px solid #F0F2F5',
                        background: on ? '#F0F9FF' : '#fff',
                        color: '#1F2937',
                        fontSize: '12.5px',
                      }}
                      onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#F6F8FA'; }}
                      onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#fff'; }}
                    >
                      <input
                        type={rl.multi ? 'checkbox' : 'radio'}
                        checked={on}
                        onChange={() => {
                          if (rl.multi) {
                            toggleReason(r);
                          } else {
                            setReasons([r]);
                            setCustomReason('');
                          }
                        }}
                        className="h-[15px] w-[15px] flex-none"
                      />
                      <span>{r}</span>
                    </label>
                  );
                })}
              </div>
              {mqaOver3 && (
                <div className="mt-2 rounded-lg p-[9px] text-[11.5px] leading-relaxed" style={{ color: '#8A5A06', background: '#FFFBEB' }}>
                  <b>{reasons.filter(x => x !== 'Other').length} parameters flagged against MQA.</b> MQA is defined as 3–4/5 — three or more failed parameters falls within <b>LQA</b>. Review before referring to the Assurance Controller.
                </div>
              )}
              {otherSelected && (
                <textarea
                  className="mt-2 w-full px-3 py-[11px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2196D8]"
                  rows={2}
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Required. State the reason in full — it is recorded on the entry and reported."
                  style={{ border: '1px solid #E2E6EA', borderRadius: '8px', resize: 'vertical' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-[26px] py-[14px]" style={{ borderTop: '1px solid #E2E6EA', background: '#FAFBFC' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-[11px] rounded-lg text-[13.5px] font-semibold border-0 cursor-pointer"
            style={{ background: '#F1F3F5', color: '#6B7280' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid() || isSubmitting}
            className="px-6 py-[11px] rounded-lg text-[13.5px] font-semibold border-0 transition-opacity"
            style={{
              background: !isValid() || isSubmitting ? '#9CA3AF' : confirmBtnClass,
              color: '#fff',
              opacity: !isValid() || isSubmitting ? '0.4' : '1',
              cursor: !isValid() || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Saving...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateJobStatusModal;
