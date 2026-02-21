"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Send,
  Phone,
  Mail,
  MessageSquare,
  ChevronLeft,
  User,
  Clock,
  Building2,
  AtSign,
  SmartphoneNfc,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type Channel = "whatsapp" | "sms" | "email";

interface Message {
  id: string;
  body: string;
  direction: "inbound" | "outbound";
  channel: Channel;
  timestamp: Date;
  subject?: string;
}

interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  channel: Channel; // primary channel
  avatar: string;
  messages: Message[];
}

// ============================================================================
// Demo Data
// ============================================================================

const DEMO_CONTACTS: Contact[] = [
  {
    id: "1",
    name: "Alex Thompson",
    company: "Meridian Analytics",
    email: "alex@meridian-analytics.com",
    phone: "+44 7700 900001",
    channel: "whatsapp",
    avatar: "AT",
    messages: [
      {
        id: "1-1",
        body: "Hi, I'm trying to access the XmR chart we set up last month. It's not showing in my library — has it been moved?",
        direction: "inbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 2 * 3600000),
      },
      {
        id: "1-2",
        body: "Hi Alex! Charts are stored locally in your browser — try the same device you used to create it. We're working on cloud sync for the next release.",
        direction: "outbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 1.8 * 3600000),
      },
      {
        id: "1-3",
        body: "Ah, that explains it! I switched laptops. Any ETA on cloud sync? That would be really useful for our team.",
        direction: "inbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 1.5 * 3600000),
      },
      {
        id: "1-4",
        body: "We're aiming for Q2. I'll make sure you're in the beta group — you'll get early access.",
        direction: "outbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 1.2 * 3600000),
      },
      {
        id: "1-5",
        body: "Perfect, thanks! Also, do you support CuSum charts for smaller datasets? We have runs of about 8–12 points.",
        direction: "inbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 40 * 60000),
      },
    ],
  },
  {
    id: "2",
    name: "Sarah Chen",
    company: "Greenfield Council",
    email: "s.chen@greenfield.gov.uk",
    phone: "+44 1234 567890",
    channel: "email",
    avatar: "SC",
    messages: [
      {
        id: "2-1",
        body: "Hello, we're evaluating Contrl for our performance improvement team. Could you send us an overview of the chart types supported, particularly for public sector KPIs?",
        direction: "inbound",
        channel: "email",
        timestamp: new Date(Date.now() - 2 * 86400000),
        subject: "Chart types for public sector",
      },
      {
        id: "2-2",
        body: "Hi Sarah! Contrl supports XmR, CuSum, p-Chart, np-Chart, c-Chart, u-Chart, and Pareto. For public sector KPIs, XmR is ideal for continuous measures (wait times, spend per unit), and p-Charts work well for proportion-based targets. Happy to arrange a walkthrough.",
        direction: "outbound",
        channel: "email",
        timestamp: new Date(Date.now() - 1.8 * 86400000),
        subject: "Re: Chart types for public sector",
      },
      {
        id: "2-3",
        body: "That's very helpful. We'd love a walkthrough. Can you do Thursday at 2pm GMT?",
        direction: "inbound",
        channel: "email",
        timestamp: new Date(Date.now() - 1 * 86400000),
        subject: "Re: Chart types for public sector",
      },
    ],
  },
  {
    id: "3",
    name: "Marcus Rivera",
    company: "Rivera Quality Systems",
    email: "marcus@rqs.io",
    phone: "+1 555 240 1188",
    channel: "sms",
    avatar: "MR",
    messages: [
      {
        id: "3-1",
        body: "Hey, just signed up. Is there a way to import data directly from Excel without copy-paste?",
        direction: "inbound",
        channel: "sms",
        timestamp: new Date(Date.now() - 5 * 3600000),
      },
      {
        id: "3-2",
        body: "Yes! Hit 'New Chart' and drag your .xlsx file onto the upload zone. It auto-detects columns. Let me know if you hit any snags.",
        direction: "outbound",
        channel: "sms",
        timestamp: new Date(Date.now() - 4.7 * 3600000),
      },
      {
        id: "3-3",
        body: "Worked perfectly. What about multiple worksheets?",
        direction: "inbound",
        channel: "sms",
        timestamp: new Date(Date.now() - 4.5 * 3600000),
      },
      {
        id: "3-4",
        body: "It reads Sheet 1 by default right now. Multi-sheet support is on the roadmap — should land in the next month or two.",
        direction: "outbound",
        channel: "sms",
        timestamp: new Date(Date.now() - 4.2 * 3600000),
      },
    ],
  },
  {
    id: "4",
    name: "Emma Wilson",
    company: "Wilson & Partners LLP",
    email: "emma.wilson@wilsonpartners.co.uk",
    phone: "+44 7911 112233",
    channel: "whatsapp",
    avatar: "EW",
    messages: [
      {
        id: "4-1",
        body: "Hi! Love the app so far. Quick question — can we export charts as PDF or PNG for client reports?",
        direction: "inbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 3 * 86400000),
      },
      {
        id: "4-2",
        body: "So glad you're enjoying it! PNG export is available via the download icon in the chart toolbar. PDF export is coming in the next sprint — probably 2–3 weeks out.",
        direction: "outbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 2.9 * 86400000),
      },
      {
        id: "4-3",
        body: "Great! Also, is there a way to annotate charts with notes or rules violations before exporting?",
        direction: "inbound",
        channel: "whatsapp",
        timestamp: new Date(Date.now() - 2.8 * 86400000),
      },
    ],
  },
  {
    id: "5",
    name: "David Park",
    company: "Nexus Manufacturing",
    email: "d.park@nexusmfg.com",
    phone: "+1 604 882 5500",
    channel: "email",
    avatar: "DP",
    messages: [
      {
        id: "5-1",
        body: "Following up on our conversation from last week — we've started using the p-Chart for our defect rate tracking. It's working well but we're unsure how to interpret the sigma limits when our sample sizes vary significantly.",
        direction: "inbound",
        channel: "email",
        timestamp: new Date(Date.now() - 7 * 86400000),
        subject: "p-Chart variable sample sizes",
      },
      {
        id: "5-2",
        body: "Great question, David. With variable sample sizes, each point on the p-Chart gets its own control limits — wider for smaller samples, narrower for larger ones. This is the correct statistical behaviour. The chart will show this automatically. If your subgroup sizes vary by more than ~25%, you may want to use a Laney p-Chart — happy to discuss.",
        direction: "outbound",
        channel: "email",
        timestamp: new Date(Date.now() - 6.8 * 86400000),
        subject: "Re: p-Chart variable sample sizes",
      },
      {
        id: "5-3",
        body: "That's exactly what we're seeing. Our runs range from 50–300 units. Would you recommend switching to Laney for this range?",
        direction: "inbound",
        channel: "email",
        timestamp: new Date(Date.now() - 6 * 86400000),
        subject: "Re: p-Chart variable sample sizes",
      },
      {
        id: "5-4",
        body: "For that range (6:1 ratio), standard p-Chart is fine. Laney becomes more valuable above ~10:1 variation. I'd stick with what you have.",
        direction: "outbound",
        channel: "email",
        timestamp: new Date(Date.now() - 5.8 * 86400000),
        subject: "Re: p-Chart variable sample sizes",
      },
      {
        id: "5-5",
        body: "Perfect. Thanks for the clear guidance. We'll be renewing for the team plan next month.",
        direction: "inbound",
        channel: "email",
        timestamp: new Date(Date.now() - 5 * 86400000),
        subject: "Re: p-Chart variable sample sizes",
      },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ============================================================================
// Channel Badge
// ============================================================================

function ChannelBadge({ channel, size = "sm" }: { channel: Channel; size?: "xs" | "sm" }) {
  const config: Record<Channel, { label: string; className: string; icon: React.ReactNode }> = {
    whatsapp: {
      label: "WhatsApp",
      className: "bg-emerald-950/60 border-emerald-500/30 text-emerald-400",
      icon: <MessageSquare className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />,
    },
    sms: {
      label: "SMS",
      className: "bg-blue-950/60 border-blue-500/30 text-blue-400",
      icon: <SmartphoneNfc className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />,
    },
    email: {
      label: "Email",
      className: "bg-purple-950/60 border-purple-500/30 text-purple-400",
      icon: <Mail className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />,
    },
  };
  const cfg = config[channel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border rounded-full font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        cfg.className
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ============================================================================
// Avatar
// ============================================================================

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  return (
    <div
      className={cn(
        "rounded-full bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center shrink-0 font-semibold text-indigo-300",
        sz
      )}
    >
      {initials}
    </div>
  );
}

// ============================================================================
// Left Panel — Contact List
// ============================================================================

interface ContactListProps {
  contacts: Contact[];
  selected: Contact | null;
  search: string;
  channelFilter: Channel | "all";
  onSearch: (v: string) => void;
  onFilter: (v: Channel | "all") => void;
  onSelect: (c: Contact) => void;
}

function ContactListPanel({
  contacts,
  selected,
  search,
  channelFilter,
  onSearch,
  onFilter,
  onSelect,
}: ContactListProps) {
  const filtered = contacts.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === "all" || c.channel === channelFilter;
    return matchSearch && matchChannel;
  });

  const tabs: { key: Channel | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "sms", label: "SMS" },
    { key: "email", label: "Email" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="text-sm font-semibold text-gray-200 mb-3">Messages</div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-0 transition-colors"
          />
        </div>
        {/* Channel tabs */}
        <div className="flex gap-1 mt-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilter(tab.key)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                channelFilter === tab.key
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-12">No contacts found</div>
        ) : (
          filtered.map((contact) => {
            const lastMsg = contact.messages[contact.messages.length - 1];
            const isActive = selected?.id === contact.id;
            return (
              <button
                key={contact.id}
                onClick={() => onSelect(contact)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-l-2",
                  isActive
                    ? "border-indigo-500 bg-indigo-950/20"
                    : "border-transparent hover:bg-white/[0.03]"
                )}
              >
                <Avatar initials={contact.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-sm font-medium truncate", isActive ? "text-indigo-300" : "text-gray-200")}>
                      {contact.name}
                    </span>
                    <span className="text-[10px] text-gray-600 shrink-0">{formatTime(lastMsg.timestamp)}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">{contact.company}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <ChannelBadge channel={contact.channel} size="xs" />
                    <span className="text-[11px] text-gray-600 truncate">{lastMsg.body.slice(0, 40)}…</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Middle Panel — Conversation Thread
// ============================================================================

interface ConversationPanelProps {
  contact: Contact | null;
  onBack: () => void;
  showBack: boolean;
}

function ConversationPanel({ contact, onBack, showBack }: ConversationPanelProps) {
  const [message, setMessage] = React.useState("");
  const [replyChannel, setReplyChannel] = React.useState<Channel>("whatsapp");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (contact) {
      setReplyChannel(contact.channel);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [contact]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [contact?.messages.length]);

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
          <MessageSquare className="h-6 w-6 text-gray-700" />
        </div>
        <div className="text-sm font-medium text-gray-400">Select a conversation</div>
        <div className="text-xs text-gray-600 mt-1.5 max-w-[200px]">
          Choose a contact from the list to view their messages
        </div>
      </div>
    );
  }

  const channelOptions: { value: Channel; label: string }[] = [
    { value: "whatsapp", label: "WhatsApp" },
    { value: "sms", label: "SMS" },
    { value: "email", label: "Email" },
  ];

  const channelColors: Record<Channel, string> = {
    whatsapp: "text-emerald-400",
    sms: "text-blue-400",
    email: "text-purple-400",
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
        {showBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-gray-300 transition-colors lg:hidden">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <Avatar initials={contact.avatar} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-200">{contact.name}</div>
          <div className="text-xs text-gray-500">{contact.company}</div>
        </div>
        <ChannelBadge channel={contact.channel} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {contact.messages.map((msg) => {
          const isOut = msg.direction === "outbound";
          return (
            <div key={msg.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[72%] flex flex-col gap-1", isOut ? "items-end" : "items-start")}>
                {/* Subject line for email */}
                {msg.subject && (
                  <div className="text-[10px] text-gray-600 px-1">
                    <span className="font-medium text-gray-500">Subj:</span> {msg.subject}
                  </div>
                )}
                <div
                  className={cn(
                    "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    isOut
                      ? "bg-indigo-600/25 border border-indigo-500/20 text-indigo-100 rounded-br-sm"
                      : "bg-white/[0.05] border border-white/[0.07] text-gray-300 rounded-bl-sm"
                  )}
                >
                  {msg.body}
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <ChannelBadge channel={msg.channel} size="xs" />
                  <span className="text-[10px] text-gray-700">{formatTimestamp(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="border-t border-white/[0.06] px-4 py-3 shrink-0">
        {/* Channel selector */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[11px] text-gray-600">Reply via</span>
          <div className="flex gap-1">
            {channelOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setReplyChannel(opt.value)}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-all",
                  replyChannel === opt.value
                    ? cn(
                        "border-current",
                        channelColors[opt.value],
                        opt.value === "whatsapp"
                          ? "bg-emerald-950/40"
                          : opt.value === "sms"
                          ? "bg-blue-950/40"
                          : "bg-purple-950/40"
                      )
                    : "border-white/[0.06] text-gray-600 hover:text-gray-400 hover:border-white/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                setMessage("");
              }
            }}
            placeholder={`Message via ${replyChannel}…`}
            className="flex-1 px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
          <button
            onClick={() => setMessage("")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shrink-0",
              message.trim()
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-white/[0.04] text-gray-600 cursor-not-allowed"
            )}
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Right Panel — Contact Details
// ============================================================================

function ContactDetailPanel({ contact }: { contact: Contact }) {
  const stats = [
    { label: "Total Messages", value: contact.messages.length },
    { label: "Inbound", value: contact.messages.filter((m) => m.direction === "inbound").length },
    { label: "Outbound", value: contact.messages.filter((m) => m.direction === "outbound").length },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top */}
      <div className="px-5 py-5 border-b border-white/[0.06] text-center">
        <Avatar initials={contact.avatar} size="lg" />
        <div className="mt-3 text-sm font-semibold text-gray-200">{contact.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{contact.company}</div>
        <div className="mt-2">
          <ChannelBadge channel={contact.channel} />
        </div>
      </div>

      {/* Contact info */}
      <div className="px-4 py-4 space-y-3 border-b border-white/[0.06]">
        <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">Contact Info</div>
        <div className="flex items-start gap-2.5">
          <AtSign className="h-3.5 w-3.5 text-gray-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] text-gray-600">Email</div>
            <div className="text-xs text-gray-300">{contact.email}</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Phone className="h-3.5 w-3.5 text-gray-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] text-gray-600">Phone</div>
            <div className="text-xs text-gray-300">{contact.phone}</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Building2 className="h-3.5 w-3.5 text-gray-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] text-gray-600">Company</div>
            <div className="text-xs text-gray-300">{contact.company}</div>
          </div>
        </div>
      </div>

      {/* Message stats */}
      <div className="px-4 py-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">Thread Stats</div>
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{s.label}</span>
            <span className="text-xs font-semibold text-gray-300">{s.value}</span>
          </div>
        ))}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">Last Activity</span>
          <span className="text-xs font-semibold text-gray-300">
            {formatTime(contact.messages[contact.messages.length - 1].timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function CommunicationsPage() {
  const [selected, setSelected] = React.useState<Contact | null>(DEMO_CONTACTS[0]);
  const [search, setSearch] = React.useState("");
  const [channelFilter, setChannelFilter] = React.useState<Channel | "all">("all");

  const showBack = selected !== null;

  return (
    <div className="h-[calc(100vh-3.5rem)] -mx-6 -mb-6 flex overflow-hidden bg-[#0a0a0a]">
      {/* LEFT — Contact List */}
      <div
        className={cn(
          "w-full md:w-[280px] shrink-0",
          "border-r border-white/[0.06] bg-[#0f0f0f]",
          // Mobile: hide when conversation selected
          selected ? "hidden md:flex md:flex-col" : "flex flex-col"
        )}
      >
        <ContactListPanel
          contacts={DEMO_CONTACTS}
          selected={selected}
          search={search}
          channelFilter={channelFilter}
          onSearch={setSearch}
          onFilter={setChannelFilter}
          onSelect={setSelected}
        />
      </div>

      {/* MIDDLE — Conversation */}
      <div
        className={cn(
          "flex-1 min-w-0",
          "flex flex-col bg-[#0a0a0a]",
          // Mobile: show when conversation selected
          !selected ? "hidden md:flex" : "flex"
        )}
      >
        <ConversationPanel
          contact={selected}
          onBack={() => setSelected(null)}
          showBack={showBack}
        />
      </div>

      {/* RIGHT — Contact Detail */}
      <div
        className={cn(
          "hidden lg:flex lg:flex-col",
          "w-[260px] shrink-0",
          "border-l border-white/[0.06] bg-[#0f0f0f]"
        )}
      >
        {selected ? (
          <ContactDetailPanel contact={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <User className="h-6 w-6 text-gray-700 mb-3" />
            <div className="text-xs text-gray-600">Select a contact to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}
