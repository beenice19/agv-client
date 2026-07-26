const agvSecurityIncidentResponsePolicy = {
  id: "security",
  category: "Safety",
  title: "Security and Incident Response Policy",
  version: "2.0 Draft",
  effectiveDate: "Pending Founder Approval",
  status: "Founder Review",
  summary:
    "This policy describes how Avant Global Vision protects accounts, systems, broadcasts, data, payments, administrative controls, and platform operations, and how AGV prepares for, detects, responds to, recovers from, documents, and reviews security incidents.",
  sections: [
    {
      heading: "1. Purpose",
      paragraphs: [
        "Avant Global Vision, also referred to as AGV, maintains security and incident-response practices intended to protect users, hosts, viewers, organizations, platform operations, information, and services.",
        "This policy establishes a consistent framework for preparing for, identifying, assessing, containing, investigating, resolving, and learning from security incidents."
      ]
    },
    {
      heading: "2. Scope",
      paragraphs: [
        "This policy applies to AGV accounts, applications, websites, servers, databases, integrations, administrative systems, payment workflows, live broadcasts, communications, devices, personnel, contractors, and service providers.",
        "It applies to suspected and confirmed incidents affecting confidentiality, integrity, availability, authenticity, safety, privacy, financial operations, or legal compliance."
      ]
    },
    {
      heading: "3. Relationship to Other Policies",
      paragraphs: [
        "This policy supplements the AGV Terms of Service, Privacy Policy, Host Agreement, Viewer Agreement, Community Standards, payment policies, DMCA and Copyright Policy, and other applicable requirements.",
        "Privacy incidents, payment disputes, content violations, legal requests, and safety emergencies may require coordinated action under several AGV policies."
      ]
    },
    {
      heading: "4. Security Governance",
      paragraphs: [
        "AGV will assign reasonable security responsibilities to authorized personnel and maintain escalation paths appropriate to its size, services, and risk profile.",
        "The Founder retains final governance authority unless responsibility has been formally delegated through approved AGV procedures."
      ]
    },
    {
      heading: "5. Shared Responsibility",
      paragraphs: [
        "AGV is responsible for reasonable protection of platform-controlled systems and operations.",
        "Users, hosts, administrators, contractors, and service providers remain responsible for protecting their own credentials, devices, connections, content, personnel, integrations, and authorized access."
      ]
    },
    {
      heading: "6. Risk-Based Security",
      paragraphs: [
        "AGV may prioritize safeguards according to likelihood, potential impact, data sensitivity, service criticality, exploitability, legal obligations, and operational cost.",
        "No security program can eliminate every risk, prevent every incident, or guarantee uninterrupted service."
      ]
    },
    {
      heading: "7. Defense in Depth",
      paragraphs: [
        "AGV may use multiple safeguards, including authentication controls, authorization checks, encryption, segmentation, logging, backups, monitoring, rate limits, provider protections, and administrative review.",
        "Failure of one safeguard should not automatically provide unrestricted access to other protected systems."
      ]
    },
    {
      heading: "8. Least Privilege",
      paragraphs: [
        "Access should be limited to the minimum permissions reasonably required for an approved role or task.",
        "Elevated, financial, moderation, infrastructure, and Super Admin privileges should be separately controlled and periodically reviewed."
      ]
    },
    {
      heading: "9. Account Protection",
      paragraphs: [
        "Users must maintain accurate account information, use strong unique passwords, protect recovery channels, and prevent unauthorized use.",
        "Users must promptly report suspected account compromise, unexplained access, credential exposure, or unauthorized changes."
      ]
    },
    {
      heading: "10. Administrative Access",
      paragraphs: [
        "Administrative access must be restricted to authorized persons and used only for legitimate AGV purposes.",
        "AGV may require additional authentication, session controls, access logging, approval procedures, or device safeguards for privileged functions."
      ]
    },
    {
      heading: "11. Founder and Super Admin Protection",
      paragraphs: [
        "Founder and Super Admin access must be protected against unauthorized use while preserving a controlled and auditable recovery path for the Founder.",
        "Security controls must not intentionally create an unrecoverable condition in which the lawful Founder is permanently locked out of AGV."
      ]
    },
    {
      heading: "12. Authentication and Sessions",
      paragraphs: [
        "AGV may use passwords, tokens, multifactor authentication, session expiration, device verification, rate limiting, and other safeguards.",
        "AGV may invalidate sessions or require reauthentication when compromise, unusual activity, credential changes, or elevated-risk actions are detected."
      ]
    },
    {
      heading: "13. Credential Handling",
      paragraphs: [
        "Passwords, API keys, service-role keys, private tokens, payment secrets, and comparable credentials must not be placed in public repositories, client-visible code, screenshots, chat, or unsecured documents.",
        "Exposed credentials should be revoked or rotated promptly and investigated for unauthorized use."
      ]
    },
    {
      heading: "14. Access Reviews",
      paragraphs: [
        "AGV may periodically review user roles, administrator privileges, service accounts, integrations, inactive accounts, and access to sensitive systems.",
        "Access should be removed or adjusted when no longer justified."
      ]
    },
    {
      heading: "15. Secure Development",
      paragraphs: [
        "AGV should use controlled development, testing, review, backup, verification, and deployment procedures appropriate to the risk of each change.",
        "Security-sensitive changes should be narrow, rollback-capable, and validated before broader deployment."
      ]
    },
    {
      heading: "16. Change Management",
      paragraphs: [
        "Material production changes should identify the intended scope, affected systems, verification method, recovery plan, and authorized decision-maker.",
        "Unrelated or speculative changes should be avoided during active incident response unless required to contain immediate harm."
      ]
    },
    {
      heading: "17. Dependency and Software Risk",
      paragraphs: [
        "AGV may review software dependencies, libraries, operating systems, applications, and service providers for known vulnerabilities and unsupported components.",
        "Updates may be prioritized according to severity, exploitability, compatibility, and operational risk."
      ]
    },
    {
      heading: "18. Infrastructure Security",
      paragraphs: [
        "AGV may use network controls, hosting-provider protections, firewall rules, secure configuration, isolation, monitoring, and restricted management interfaces.",
        "Infrastructure access must not be shared or exposed beyond legitimate operational need."
      ]
    },
    {
      heading: "19. Data Protection",
      paragraphs: [
        "AGV may use encryption, access controls, minimization, retention limits, secure transmission, backups, and other safeguards appropriate to the information involved.",
        "Users must not attempt to access, extract, alter, disclose, or destroy information without authorization."
      ]
    },
    {
      heading: "20. Payment-System Security",
      paragraphs: [
        "Payment processing may involve approved third-party processors and financial service providers with their own security requirements.",
        "AGV must not knowingly expose protected payment credentials or bypass required processor controls."
      ]
    },
    {
      heading: "21. Broadcast and Room Security",
      paragraphs: [
        "AGV may use room authorization, participant roles, tokens, capacity controls, moderation tools, waiting areas, ticket verification, and session restrictions.",
        "Hosts must protect event links, room credentials, moderator permissions, recording settings, and participant access."
      ]
    },
    {
      heading: "22. Logging and Audit Records",
      paragraphs: [
        "AGV may maintain logs of authentication, administrative actions, transactions, incidents, system events, moderation, configuration changes, and other relevant activity.",
        "Logs may be used for security, support, fraud prevention, legal compliance, dispute resolution, and incident investigation."
      ]
    },
    {
      heading: "23. Monitoring and Sentinel",
      paragraphs: [
        "AGV may use Sentinel and other safeguards to identify service failures, suspicious activity, unusual access, operational risk, abuse indicators, and potential incidents.",
        "Automated alerts support investigation but do not independently establish wrongdoing or guarantee detection."
      ]
    },
    {
      heading: "24. Security Incident Definition",
      paragraphs: [
        "A security incident is a suspected or confirmed event that threatens or adversely affects AGV systems, accounts, data, services, users, finances, safety, or compliance.",
        "Examples include unauthorized access, credential compromise, malware, denial of service, data exposure, fraud, destructive changes, or loss of critical availability."
      ]
    },
    {
      heading: "25. Security Event Versus Incident",
      paragraphs: [
        "A security event is an observable occurrence that may require review but does not necessarily represent an incident.",
        "AGV may reclassify an event as facts develop."
      ]
    },
    {
      heading: "26. Incident Categories",
      paragraphs: [
        "Incidents may involve accounts, applications, infrastructure, data, privacy, payments, fraud, content safety, availability, third parties, insider activity, or physical systems.",
        "An incident may belong to more than one category."
      ]
    },
    {
      heading: "27. Severity Classification",
      paragraphs: [
        "AGV may classify incidents according to potential impact, affected users, sensitive data, service interruption, financial exposure, legal duties, active exploitation, and recovery complexity.",
        "Severity may be increased or decreased as reliable information becomes available."
      ]
    },
    {
      heading: "28. Priority Levels",
      paragraphs: [
        "Lower-priority incidents may be handled through ordinary support and remediation procedures.",
        "Critical incidents may require immediate containment, executive escalation, external specialists, provider coordination, legal review, user notification, or government reporting."
      ]
    },
    {
      heading: "29. Reporting Security Concerns",
      paragraphs: [
        "Users and authorized personnel should report suspected compromise, vulnerabilities, malicious activity, unauthorized access, or data exposure through AGV's approved security-reporting process.",
        "Reports should include relevant dates, times, accounts, systems, screenshots, error messages, links, and other available evidence."
      ]
    },
    {
      heading: "30. Emergency Reporting",
      paragraphs: [
        "Immediate threats to life, physical safety, or public safety should be reported directly to appropriate emergency services.",
        "An AGV report is not a substitute for contacting emergency responders when urgent danger exists."
      ]
    },
    {
      heading: "31. Good-Faith Security Research",
      paragraphs: [
        "Security testing of AGV requires prior authorization unless AGV has published an approved vulnerability-disclosure program permitting specified research.",
        "Researchers must avoid accessing user data, disrupting services, retaining sensitive information, demanding payment, or exceeding authorized scope."
      ]
    },
    {
      heading: "32. Initial Triage",
      paragraphs: [
        "AGV may validate the report, identify affected assets, determine whether activity is continuing, assess severity, and assign responsible personnel.",
        "Early conclusions should remain provisional until supported by evidence."
      ]
    },
    {
      heading: "33. Incident Leadership",
      paragraphs: [
        "A designated incident lead may coordinate technical, operational, legal, privacy, communications, financial, and executive activities.",
        "Incident authority should be clear enough to permit timely protective decisions while preserving Founder oversight."
      ]
    },
    {
      heading: "34. Containment",
      paragraphs: [
        "Containment may include disabling accounts, revoking sessions, rotating credentials, restricting routes, isolating systems, blocking indicators, suspending transactions, or taking services offline.",
        "Containment should reduce harm while preserving evidence and avoiding unnecessary disruption."
      ]
    },
    {
      heading: "35. Evidence Preservation",
      paragraphs: [
        "AGV may preserve logs, configuration records, messages, account data, files, system images, transaction information, and other relevant evidence.",
        "Personnel and users must not knowingly alter, destroy, fabricate, or conceal evidence connected to an investigation."
      ]
    },
    {
      heading: "36. Chain of Custody",
      paragraphs: [
        "For serious incidents, AGV may document who collected, accessed, transferred, stored, or analyzed important evidence.",
        "Evidence handling should support reliability, confidentiality, legal review, and potential external investigation."
      ]
    },
    {
      heading: "37. Investigation",
      paragraphs: [
        "AGV may determine the incident's source, timeline, scope, affected assets, exploited weakness, actions taken, information accessed, and continuing risk.",
        "Investigation may involve service providers, security specialists, insurers, counsel, financial institutions, or authorities."
      ]
    },
    {
      heading: "38. Eradication",
      paragraphs: [
        "AGV may remove malicious code, unauthorized accounts, exposed credentials, unsafe configurations, persistence mechanisms, fraudulent records, or compromised components.",
        "Eradication should be verified before affected systems are considered safe for normal operation."
      ]
    },
    {
      heading: "39. Recovery",
      paragraphs: [
        "Recovery may include restoring trusted systems, validating data, resetting credentials, re-enabling services, monitoring for recurrence, and confirming operational stability.",
        "Services may be restored gradually when staged recovery reduces risk."
      ]
    },
    {
      heading: "40. Backup and Restoration",
      paragraphs: [
        "AGV may maintain backups and recovery records according to operational need, provider capability, retention requirements, and cost.",
        "Backups should be protected, tested when practical, and isolated sufficiently to reduce loss from the same incident."
      ]
    },
    {
      heading: "41. Business Continuity",
      paragraphs: [
        "AGV may prioritize critical authentication, broadcast, administrative, payment, safety, and communication functions during disruption.",
        "Temporary limitations or fallback procedures may be used while full service is being restored."
      ]
    },
    {
      heading: "42. Third-Party Incidents",
      paragraphs: [
        "An incident involving a hosting provider, payment processor, communications service, analytics provider, or other vendor may affect AGV even when AGV systems were not directly compromised.",
        "AGV may coordinate with providers, restrict integrations, change credentials, or implement alternative services."
      ]
    },
    {
      heading: "43. Privacy Incident Assessment",
      paragraphs: [
        "When personal information may have been accessed, acquired, altered, lost, or disclosed improperly, AGV may assess the type of information, affected persons, likelihood of misuse, legal requirements, and available protections.",
        "Privacy and legal review may occur alongside technical response."
      ]
    },
    {
      heading: "44. Notification Decisions",
      paragraphs: [
        "AGV may notify affected users, service providers, insurers, regulators, financial institutions, law enforcement, or other parties when required or appropriate.",
        "Notification timing, content, and recipients will depend on verified facts, legal duties, investigative needs, and protective value."
      ]
    },
    {
      heading: "45. User Security Notices",
      paragraphs: [
        "A user notice may describe the incident, information involved, actions AGV has taken, recommended protective steps, and available support.",
        "AGV may issue preliminary information when delay would materially increase risk, while clearly identifying facts that remain under investigation."
      ]
    },
    {
      heading: "46. Public Communications",
      paragraphs: [
        "Public incident statements should be accurate, authorized, appropriately limited, and coordinated with technical, legal, privacy, and operational response.",
        "AGV personnel must not make unauthorized public statements or disclose sensitive investigative details."
      ]
    },
    {
      heading: "47. Law-Enforcement Cooperation",
      paragraphs: [
        "AGV may report criminal activity, fraud, child exploitation, credible threats, extortion, theft, unauthorized access, or other serious misconduct.",
        "AGV may respond to valid legal process and preserve information when legally required or reasonably necessary."
      ]
    },
    {
      heading: "48. Post-Incident Review",
      paragraphs: [
        "After a material incident, AGV may review the timeline, cause, impact, decisions, communications, recovery, safeguards, and lessons learned.",
        "The purpose is to improve resilience and accountability, not merely assign blame."
      ]
    },
    {
      heading: "49. Corrective Actions",
      paragraphs: [
        "Corrective actions may include technical repairs, policy updates, credential rotation, training, provider changes, monitoring improvements, access restrictions, or disciplinary action.",
        "Actions should be assigned, prioritized, tracked, verified, and closed through an approved process."
      ]
    },
    {
      heading: "50. Testing and Exercises",
      paragraphs: [
        "AGV may conduct tabletop exercises, recovery tests, access reviews, backup validation, simulated incidents, and other readiness activities.",
        "Testing should avoid unnecessary risk to production systems, user information, payments, and active broadcasts."
      ]
    },
    {
      heading: "51. Training and Awareness",
      paragraphs: [
        "Personnel with access to AGV systems should receive security guidance appropriate to their responsibilities.",
        "Training may address phishing, credentials, data handling, incident reporting, privileged access, fraud, social engineering, and emergency escalation."
      ]
    },
    {
      heading: "52. Policy Enforcement",
      paragraphs: [
        "Violations of this policy may result in warnings, access restrictions, credential revocation, suspension, termination, contract action, or legal referral.",
        "Enforcement may consider severity, intent, access level, harm, cooperation, history, and risk of recurrence."
      ]
    },
    {
      heading: "53. Record Retention",
      paragraphs: [
        "Incident records may be retained for security, operations, insurance, legal compliance, dispute resolution, law enforcement, and improvement purposes.",
        "Retention periods may vary according to record type, sensitivity, provider limitations, and applicable law."
      ]
    },
    {
      heading: "54. Policy Review and Updates",
      paragraphs: [
        "AGV may update this policy as its services, technology, providers, threats, laws, and operational practices change.",
        "Material revisions may be communicated through the platform, email, account notice, or an updated effective date."
      ]
    },
    {
      heading: "55. Required Contact and Implementation Details",
      paragraphs: [
        "Before publication, AGV must insert its legal entity name, security-reporting email, mailing address, emergency-escalation process, privacy contact, authorized spokesperson process, and applicable response expectations.",
        "This Founder-review draft should be coordinated with AGV's final technical architecture, provider agreements, insurance requirements, legal obligations, and approved internal incident-response plan."
      ]
    }
  ]
};

export default agvSecurityIncidentResponsePolicy;
