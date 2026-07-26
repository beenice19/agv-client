import React, { useMemo, useState } from "react";
import agvTermsOfService from "../legal/agvTermsOfService";
import agvPrivacyPolicy from "../legal/agvPrivacyPolicy";
import agvHostAgreement from "../legal/agvHostAgreement";
import agvViewerAgreement from "../legal/agvViewerAgreement";
import agvTicketRefundPolicy from "../legal/agvTicketRefundPolicy";
import agvChargebackPolicy from "../legal/agvChargebackPolicy";
import agvDmcaCopyrightPolicy from "../legal/agvDmcaCopyrightPolicy";
import agvCommunityStandards from "../legal/agvCommunityStandards";
import agvSecurityIncidentResponsePolicy from "../legal/agvSecurityIncidentResponsePolicy";
import agvAiUseDisclosurePolicy from "../legal/agvAiUseDisclosurePolicy";
import agvAccessibilityStatement from "../legal/agvAccessibilityStatement";

const legalDocuments = [
  agvTermsOfService,
  agvPrivacyPolicy,
  agvHostAgreement,
  agvViewerAgreement,
  agvTicketRefundPolicy,
  agvChargebackPolicy,
  agvDmcaCopyrightPolicy,
  agvCommunityStandards,
  agvSecurityIncidentResponsePolicy,
  agvAiUseDisclosurePolicy,
  agvAccessibilityStatement,
  {
    id: "jurisdiction",
    category: "Compliance",
    title: "Jurisdiction Review Guide",
    status: "Guidance Only",
    summary:
      "Helps AGV leadership and hosts identify location-specific legal questions without automatically blocking, redirecting, or approving activity.",
    sections: [
      "Host and event location",
      "Ticketing and fundraising rules",
      "Games, contests, and bingo review",
      "Consumer-protection requirements",
      "Privacy and recording consent",
      "Tax and licensing questions",
      "When local counsel should review",
    ],
  },
];

const categories = [
  "All",
  "Platform",
  "Hosts",
  "Users",
  "Payments",
  "Content",
  "Safety",
  "Technology",
  "Compliance",
];

export default function AgvLegalCenter({ open, onClose }) {
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState("terms");
  const [search, setSearch] = useState("");

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return legalDocuments.filter((document) => {
      const matchesCategory =
        category === "All" || document.category === category;

      const searchableText = [
        document.title,
        document.category,
        document.status,
        document.summary,
        ...document.sections,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [category, search]);

  const selectedDocument =
    legalDocuments.find((document) => document.id === selectedId) ||
    legalDocuments[0];

  if (!open) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const printSelectedDocument = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AGV Legal Center"
      onMouseDown={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        background: "rgba(1, 4, 15, 0.88)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        style={{
          width: "min(1380px, 97vw)",
          height: "min(900px, 94vh)",
          overflow: "hidden",
          borderRadius: 28,
          border: "1px solid rgba(212,175,55,0.52)",
          background:
            "linear-gradient(145deg, rgba(7,18,39,0.99), rgba(2,7,20,0.99))",
          boxShadow: "0 35px 110px rgba(0,0,0,0.72)",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "20px 22px",
            borderBottom: "1px solid rgba(148,163,184,0.18)",
            background:
              "linear-gradient(90deg, rgba(212,175,55,0.12), rgba(30,64,175,0.12))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#facc15",
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Founder-Controlled Compliance Workspace
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 950,
              }}
            >
              AGV Legal Center
            </div>

            <div
              style={{
                marginTop: 5,
                color: "#cbd5e1",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Legal documents, policy readiness, jurisdiction guidance and
              Founder review.
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            style={{
              border: "1px solid rgba(148,163,184,0.4)",
              borderRadius: 14,
              padding: "10px 16px",
              background: "rgba(15,23,42,0.92)",
              color: "#f8fafc",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Close Legal Center
          </button>
        </header>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(270px, 340px) minmax(0, 1fr)",
          }}
        >
          <aside
            style={{
              minHeight: 0,
              overflowY: "auto",
              padding: 18,
              borderRight: "1px solid rgba(148,163,184,0.16)",
              background: "rgba(2,6,23,0.5)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 9,
                marginBottom: 16,
              }}
            >
              <div style={summaryCardStyle}>
                <div style={summaryNumberStyle}>{legalDocuments.length}</div>
                <div style={summaryLabelStyle}>Documents</div>
              </div>

              <div style={summaryCardStyle}>
                <div style={summaryNumberStyle}>
                  {
                    legalDocuments.filter(
                      (document) => document.status === "Founder Review"
                    ).length
                  }
                </div>
                <div style={summaryLabelStyle}>Awaiting Review</div>
              </div>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search legal documents"
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid rgba(96,165,250,0.34)",
                borderRadius: 14,
                padding: "11px 12px",
                background: "rgba(15,23,42,0.82)",
                color: "#f8fafc",
                outline: "none",
                marginBottom: 13,
              }}
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                marginBottom: 16,
              }}
            >
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  style={{
                    border:
                      category === item
                        ? "1px solid rgba(250,204,21,0.7)"
                        : "1px solid rgba(148,163,184,0.24)",
                    borderRadius: 999,
                    padding: "7px 10px",
                    background:
                      category === item
                        ? "rgba(212,175,55,0.18)"
                        : "rgba(15,23,42,0.74)",
                    color: category === item ? "#fde68a" : "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: 9 }}>
              {filteredDocuments.length ? (
                filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelectedId(document.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border:
                        selectedDocument.id === document.id
                          ? "1px solid rgba(96,165,250,0.62)"
                          : "1px solid rgba(148,163,184,0.18)",
                      borderRadius: 15,
                      padding: "12px 13px",
                      background:
                        selectedDocument.id === document.id
                          ? "linear-gradient(135deg, rgba(30,64,175,0.24), rgba(15,23,42,0.88))"
                          : "rgba(15,23,42,0.66)",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#93c5fd",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: 0.7,
                      }}
                    >
                      {document.category}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {document.title}
                    </div>

                    <div
                      style={{
                        marginTop: 7,
                        color:
                          document.status === "Guidance Only"
                            ? "#bfdbfe"
                            : "#fde68a",
                        fontSize: 11,
                        fontWeight: 850,
                      }}
                    >
                      {document.status}
                    </div>
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(15,23,42,0.65)",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  No legal documents match this search.
                </div>
              )}
            </div>
          </aside>

          <main
            style={{
              minWidth: 0,
              minHeight: 0,
              overflowY: "auto",
              padding: "clamp(20px, 4vw, 38px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                alignItems: "start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ maxWidth: 820 }}>
                <div
                  style={{
                    color: "#93c5fd",
                    fontSize: 12,
                    fontWeight: 950,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {selectedDocument.category}
                </div>

                <h2
                  style={{
                    margin: "8px 0 0",
                    fontSize: "clamp(25px, 4vw, 40px)",
                    lineHeight: 1.12,
                  }}
                >
                  {selectedDocument.title}
                </h2>

                <div
                  style={{
                    display: "inline-flex",
                    marginTop: 13,
                    borderRadius: 999,
                    padding: "7px 11px",
                    border: "1px solid rgba(250,204,21,0.34)",
                    background: "rgba(212,175,55,0.11)",
                    color: "#fde68a",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {selectedDocument.status}
                </div>
              </div>

              <button
                type="button"
                onClick={printSelectedDocument}
                style={{
                  border: "1px solid rgba(96,165,250,0.45)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  background: "rgba(30,64,175,0.2)",
                  color: "#dbeafe",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Print / Save as PDF
              </button>
            </div>

            <section style={contentCardStyle}>
              <div style={sectionHeadingStyle}>Purpose</div>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#dbe4f0",
                  lineHeight: 1.75,
                  fontSize: 15,
                }}
              >
                {selectedDocument.summary}
              </p>
            </section>

            <section style={contentCardStyle}>
              <div style={sectionHeadingStyle}>Document Coverage</div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {selectedDocument.sections.map((section, index) => {
                  const isFullSection =
                    section &&
                    typeof section === "object" &&
                    !Array.isArray(section);

                  if (isFullSection) {
                    return (
                      <section
                        key={section.heading || index}
                        style={{
                          padding: "18px 18px",
                          borderRadius: 16,
                          border: "1px solid rgba(96,165,250,0.20)",
                          background: "rgba(15,23,42,0.62)",
                        }}
                      >
                        <div
                          style={{
                            color: "#f8fafc",
                            fontSize: 18,
                            fontWeight: 950,
                            lineHeight: 1.4,
                          }}
                        >
                          {section.heading}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gap: 12,
                            marginTop: 13,
                          }}
                        >
                          {(section.paragraphs || []).map(
                            (paragraph, paragraphIndex) => (
                              <p
                                key={`${section.heading}-${paragraphIndex}`}
                                style={{
                                  margin: 0,
                                  color: "#dbe4f0",
                                  fontSize: 15,
                                  lineHeight: 1.78,
                                }}
                              >
                                {paragraph}
                              </p>
                            )
                          )}
                        </div>
                      </section>
                    );
                  }

                  return (
                    <div
                      key={String(section)}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        padding: "12px 13px",
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.15)",
                        background: "rgba(15,23,42,0.58)",
                      }}
                    >
                      <div
                        style={{
                          flex: "0 0 auto",
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(30,64,175,0.25)",
                          color: "#bfdbfe",
                          fontWeight: 950,
                          fontSize: 12,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div
                        style={{
                          paddingTop: 4,
                          color: "#e2e8f0",
                          fontWeight: 750,
                          lineHeight: 1.45,
                        }}
                      >
                        {section}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              style={{
                ...contentCardStyle,
                border: "1px solid rgba(250,204,21,0.3)",
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(15,23,42,0.7))",
              }}
            >
              <div style={sectionHeadingStyle}>Legal Review Notice</div>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#fef3c7",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                This Legal Center organizes AGV policy documents and compliance
                work. It does not automatically approve an activity, determine
                legality in a jurisdiction, redirect users, or replace advice
                from qualified legal counsel.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

const summaryCardStyle = {
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: 15,
  padding: 12,
  background: "rgba(15,23,42,0.7)",
};

const summaryNumberStyle = {
  color: "#fde68a",
  fontSize: 23,
  fontWeight: 950,
};

const summaryLabelStyle = {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 800,
};

const contentCardStyle = {
  marginTop: 22,
  padding: "18px 20px",
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.17)",
  background: "rgba(15,23,42,0.54)",
};

const sectionHeadingStyle = {
  color: "#f8fafc",
  fontSize: 16,
  fontWeight: 950,
};
