import React, { useEffect, useMemo, useState } from "react";

// PASS CU-10J1 AGV NETWORK VIEWER SHELL
const AGV_MEDIA_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_AGV_SERVER_API_URL ||
  "http://127.0.0.1:8787";

const AGV_SUBSCRIPTION_API_BASE =
  import.meta.env.VITE_AGV_SUBSCRIPTION_API_URL ||
  "http://127.0.0.1:8792";

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "live", label: "Live Stations" },
  { id: "ondemand", label: "On Demand" },
  { id: "news", label: "News" },
  { id: "education", label: "Education" },
  { id: "archives", label: "Archives" },
];

// PASS YTI-02 - PUBLIC YOUTUBE ON DEMAND PLAYBACK
function isYouTubeOnDemandItem(item) {
  const sourceType = String(
    item?.sourceType || ""
  )
    .trim()
    .toUpperCase();

  const videoId = String(
    item?.videoId || ""
  ).trim();

  return (
    sourceType === "YOUTUBE" &&
    /^[A-Za-z0-9_-]{11}$/.test(videoId)
  );
}

// PASS PLEX-02 - PUBLIC PLEX EXTERNAL REDIRECT
function isPlexExternalRedirectItem(item) {
  const sourceType = String(
    item?.sourceType || ""
  )
    .trim()
    .toUpperCase();

  const playbackMode = String(
    item?.playbackMode || ""
  )
    .trim()
    .toUpperCase();

  const rightsStatus = String(
    item?.rightsStatus || ""
  )
    .trim()
    .toUpperCase();

  return (
    sourceType ===
      "PLEX_EXTERNAL_LINK" &&
    playbackMode ===
      "EXTERNAL_REDIRECT" &&
    rightsStatus ===
      "LINK_ONLY_NO_AGV_PLAYBACK" &&
    item?.noAgvPlayback === true
  );
}

function plexExternalRedirectUrl(item) {
  if (
    !isPlexExternalRedirectItem(
      item
    )
  ) {
    return "";
  }

  const rawUrl = String(
    item?.externalUrl ||
      item?.sourceUrl ||
      ""
  ).trim();

  if (!rawUrl) {
    return "";
  }

  try {
    const parsed =
      new URL(rawUrl);

    const allowedHosts =
      new Set([
        "watch.plex.tv",
        "l.plex.tv",
      ]);

    if (
      parsed.protocol !== "https:" ||
      !allowedHosts.has(
        parsed.hostname.toLowerCase()
      )
    ) {
      return "";
    }

    return parsed.href;
  } catch {
    return "";
  }
}

function openPlexExternalRedirect(item) {
  const destination =
    plexExternalRedirectUrl(
      item
    );

  if (!destination) {
    return false;
  }

  const opened =
    window.open(
      destination,
      "_blank",
      "noopener,noreferrer"
    );

  if (opened) {
    opened.opener = null;
  } else {
    window.location.assign(
      destination
    );
  }

  return true;
}

function mediaYouTubeEmbedUrl(item) {
  if (!isYouTubeOnDemandItem(item)) {
    return "";
  }

  const direct = String(
    item?.embedUrl || ""
  ).trim();

  return direct.startsWith(
    "https://www.youtube-nocookie.com/embed/"
  )
    ? direct
    : "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(item.videoId) +
        "?autoplay=1&playsinline=1&controls=1&fs=1&rel=0";
}

function mediaPlaybackUrl(item) {
  const playbackPath = String(item?.playbackPath || "").trim();

  if (!playbackPath) return "";

  return playbackPath.startsWith("http")
    ? playbackPath
    : AGV_MEDIA_API_BASE + playbackPath;
}

function stationEmbedUrl(station) {
  const directEmbed = String(station?.embedUrl || "").trim();

  if (directEmbed) return directEmbed;

  const videoId = String(
    station?.videoId || station?.fallbackVideoId || ""
  ).trim();

  if (!videoId) return "";

  return (
    "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(videoId) +
    "?autoplay=1&mute=1&playsinline=1&controls=1&fs=1&rel=0"
  );
}

function EmptySection({ title, description }) {
  return (
    <section style={styles.emptySection}>
      <div style={styles.emptyIcon}>AGV</div>
      <h2 style={styles.emptyTitle}>{title}</h2>
      <p style={styles.emptyDescription}>{description}</p>
      <div style={styles.managedBadge}>
        Founder-managed section — approved content coming soon
      </div>
    </section>
  );
}

// PASS NTH-01 AGV NETWORK REAL THUMBNAILS
function stationThumbnailUrl(station) {
  const directThumbnail = String(
    station?.thumbnail ||
      station?.artwork ||
      station?.imageUrl ||
      ""
  ).trim();

  if (directThumbnail) return directThumbnail;

  const videoId = String(
    station?.videoId ||
      station?.fallbackVideoId ||
      ""
  ).trim();

  if (!videoId) return "";

  return (
    "https://i.ytimg.com/vi/" +
    encodeURIComponent(videoId) +
    "/hqdefault.jpg"
  );
}

function mediaPosterUrl(item) {
  return String(
    item?.thumbnail ||
      item?.poster ||
      item?.posterUrl ||
      item?.artwork ||
      item?.artworkUrl ||
      ""
  ).trim();
}

export default function AgvNetworkViewerShell() {
  // PASS CU-10J2 AGV NETWORK RESPONSIVE VALIDATION AND POLISH
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth
  );

  const isMobile = viewportWidth < 680;
  const isTablet = viewportWidth >= 680 && viewportWidth < 1040;

  const [activeSection, setActiveSection] = useState("home");

  const [stations, setStations] = useState([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);

  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);

  async function loadStations() {
    setStationsLoading(true);
    setStationsError("");

    try {
      const response = await fetch(
        AGV_SUBSCRIPTION_API_BASE + "/api/network/stations",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "AGV Network live stations are unavailable."
        );
      }

      const publicStations = Array.isArray(result.stations)
        ? result.stations.filter(
            (station) =>
              station?.enabled === true &&
              String(station?.rightsStatus || "").toUpperCase() ===
                "APPROVED_EMBED"
          )
        : [];

      setStations(publicStations);

      setSelectedStation((current) => {
        if (!publicStations.length) return null;

        return (
          publicStations.find(
            (station) => station.id === current?.id
          ) || publicStations[0]
        );
      });
    } catch (error) {
      setStationsError(
        error?.message || "AGV Network live stations are unavailable."
      );
    } finally {
      setStationsLoading(false);
    }
  }

  async function loadOnDemand() {
    setMediaLoading(true);
    setMediaError("");

    try {
      const response = await fetch(
        AGV_MEDIA_API_BASE + "/api/media/public",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "AGV Network On Demand is unavailable."
        );
      }

      const publicItems = Array.isArray(result.items)
        ? result.items.filter(
            (item) =>
              String(item?.intakeId || "").trim() &&
              (
                String(item?.playbackPath || "").trim() ||
                isYouTubeOnDemandItem(item) ||
                isPlexExternalRedirectItem(item)
              )
          )
        : [];

      setMediaItems(publicItems);

      setSelectedMedia((current) => {
        if (!publicItems.length) {
          return null;
        }

        const retained =
          publicItems.find(
            (item) =>
              item.intakeId ===
              current?.intakeId
          );

        if (retained) {
          return retained;
        }

        return (
          publicItems.find(
            (item) =>
              !isPlexExternalRedirectItem(
                item
              )
          ) ||
          publicItems[0]
        );
      });
    } catch (error) {
      setMediaError(
        error?.message || "AGV Network On Demand is unavailable."
      );
    } finally {
      setMediaLoading(false);
    }
  }

  useEffect(() => {
    loadStations();
    loadOnDemand();
  }, []);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const liveCount = useMemo(
    () =>
      stations.filter(
        (station) =>
          String(station?.healthStatus || "").toUpperCase() === "ONLINE"
      ).length,
    [stations]
  );

  function openLiveStation(station) {
    setSelectedStation(station);
    setActiveSection("live");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openOnDemand(item) {
    if (
      isPlexExternalRedirectItem(
        item
      )
    ) {
      openPlexExternalRedirect(
        item
      );
      return;
    }

    setSelectedMedia(item);
    setActiveSection("ondemand");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div style={styles.shell}>
      <header
        style={{
          ...styles.header,
          padding: isMobile
            ? "14px 16px"
            : styles.header.padding,
          alignItems: isMobile ? "flex-start" : "center",
        }}
      >
        <div style={styles.brand}>
          <div style={styles.logo}>AGV</div>

          <div>
            <h1 style={styles.brandTitle}>AGV Network</h1>
            <div style={styles.brandSubtitle}>
              Live stations, original programming, education and archives
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.headerActions,
            width: isMobile ? "100%" : "auto",
            justifyContent: isMobile
              ? "space-between"
              : "flex-start",
          }}
        >
          <div style={styles.statusBadge}>
            <span style={styles.statusDot} />
            {liveCount} live station{liveCount === 1 ? "" : "s"}
          </div>

          {/* PASS CP-10 PUBLIC PARTNER SUBMISSION CTA */}
          <button
            type="button"
            aria-label="Submit content to AGV"
            style={{
              ...styles.homeButton,
              border: "1px solid rgba(250,204,21,0.62)",
              background:
                "linear-gradient(135deg, #facc15, #a16207)",
              color: "#111827",
              boxShadow: "0 8px 24px rgba(161,98,7,0.2)",
            }}
            onClick={() => {
              window.location.href = "/content-partner";
            }}
          >
            Submit Content to AGV
          </button>

          <button
            type="button"
            style={styles.homeButton}
            onClick={() => {
              window.location.href = "/";
            }}
          >
            AGV Home
          </button>
        </div>
      </header>

      <nav
        style={{
          ...styles.navigation,
          padding: isMobile
            ? "10px 12px"
            : styles.navigation.padding,
        }}
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            style={
              activeSection === item.id
                ? styles.navButtonActive
                : styles.navButton
            }
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main
        style={{
          ...styles.main,
          width: isMobile
            ? "calc(100% - 20px)"
            : styles.main.width,
          padding: isMobile
            ? "16px 0 36px"
            : styles.main.padding,
        }}
      >
        {activeSection === "home" ? (
          <>
            <section
              style={{
                ...styles.hero,
                gridTemplateColumns:
                  isMobile || isTablet
                    ? "minmax(0, 1fr)"
                    : styles.hero.gridTemplateColumns,
                padding: isMobile
                  ? "24px 18px"
                  : styles.hero.padding,
                gap: isMobile ? 20 : styles.hero.gap,
                borderRadius: isMobile
                  ? 20
                  : styles.hero.borderRadius,
              }}
            >
              <div>
                <div style={styles.eyebrow}>AVANT GLOBAL VISION</div>
                <h2
                  style={{
                    ...styles.heroTitle,
                    fontSize: isMobile
                      ? 38
                      : styles.heroTitle.fontSize,
                    lineHeight: isMobile
                      ? 1.04
                      : styles.heroTitle.lineHeight,
                  }}
                >
                  Watch AGV Network
                </h2>
                <p style={styles.heroText}>
                  Discover live public stations and Founder-approved
                  On Demand programming through one controlled AGV
                  viewing experience.
                </p>

                <div style={styles.heroButtons}>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={() => setActiveSection("live")}
                  >
                    Watch Live Stations
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setActiveSection("ondemand")}
                  >
                    Browse On Demand
                  </button>
                </div>
              </div>

              <div
                style={{
                  ...styles.heroMetrics,
                  gridTemplateColumns: isMobile
                    ? "minmax(0, 1fr)"
                    : isTablet
                      ? "repeat(3, minmax(0, 1fr))"
                      : styles.heroMetrics.gridTemplateColumns,
                }}
              >
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Live Stations</span>
                  <strong style={styles.metricValue}>{liveCount}</strong>
                </div>

                <div style={styles.metric}>
                  <span style={styles.metricLabel}>On Demand</span>
                  <strong style={styles.metricValue}>
                    {mediaItems.length}
                  </strong>
                </div>

                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Public Access</span>
                  <strong style={styles.metricSmall}>Free</strong>
                </div>
              </div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionEyebrow}>LIVE NOW</div>
                  <h2 style={styles.sectionTitle}>Live Stations</h2>
                </div>

                <button
                  type="button"
                  style={styles.textButton}
                  onClick={() => setActiveSection("live")}
                >
                  View all stations
                </button>
              </div>

              {stationsLoading ? (
                <div style={styles.messageBox}>Loading live stations...</div>
              ) : stationsError ? (
                <div style={styles.errorBox}>{stationsError}</div>
              ) : (
                <div
                  style={{
                    ...styles.cardGrid,
                    gridTemplateColumns: isMobile
                      ? "minmax(0, 1fr)"
                      : styles.cardGrid.gridTemplateColumns,
                  }}
                >
                  {stations.slice(0, 3).map((station) => (
                    <button
                      key={station.id}
                      type="button"
                      style={styles.contentCard}
                      onClick={() => openLiveStation(station)}
                    >
                      <div
                        style={{
                          ...styles.liveCardVisual,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {stationThumbnailUrl(station) ? (
                          <img
                            src={stationThumbnailUrl(station)}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            style={styles.cardThumbnailImage}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}

                        <div style={styles.cardThumbnailShade} />

                        <span
                          style={{
                            ...styles.livePill,
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          {station.badge || "LIVE"}
                        </span>

                        <div
                          style={{
                            ...styles.visualLogo,
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          AGV
                        </div>
                      </div>

                      <div style={styles.cardBody}>
                        <div style={styles.cardCategory}>
                          {station.category || "AGV Network"}
                        </div>
                        <h3 style={styles.cardTitle}>{station.title}</h3>
                        <p style={styles.cardDescription}>
                          {station.description}
                        </p>
                        <div style={styles.cardFooter}>
                          {station.provider || station.source}
                          <span>{station.schedule || "24/7"}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionEyebrow}>WATCH ANYTIME</div>
                  <h2 style={styles.sectionTitle}>On Demand</h2>
                </div>

                <button
                  type="button"
                  style={styles.textButton}
                  onClick={() => setActiveSection("ondemand")}
                >
                  View all programs
                </button>
              </div>

              {mediaLoading ? (
                <div style={styles.messageBox}>
                  Loading On Demand programs...
                </div>
              ) : mediaError ? (
                <div style={styles.errorBox}>{mediaError}</div>
              ) : mediaItems.length ? (
                <div
                  style={{
                    ...styles.cardGrid,
                    gridTemplateColumns: isMobile
                      ? "minmax(0, 1fr)"
                      : styles.cardGrid.gridTemplateColumns,
                  }}
                >
                  {mediaItems.slice(0, 3).map((item) => (
                    <button
                      key={item.intakeId}
                      type="button"
                      style={styles.contentCard}
                      onClick={() => openOnDemand(item)}
                    >
                      <div
                        style={{
                          ...styles.onDemandVisual,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {isPlexExternalRedirectItem(item) ? (
                          <div
                            aria-hidden="true"
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                              background:
                                "radial-gradient(circle at top, rgba(229,160,13,0.3), rgba(15,23,42,0.96) 64%)",
                              color: "#fbbf24",
                              fontWeight: 950,
                              fontSize: 34,
                              letterSpacing: "0.12em",
                            }}
                          >
                            PLEX
                          </div>
                        ) : isYouTubeOnDemandItem(item) ? (
                          <img
                            src={mediaPosterUrl(item)}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            style={styles.cardThumbnailImage}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <video
                            aria-hidden="true"
                            tabIndex={-1}
                            muted
                            playsInline
                            preload="metadata"
                            poster={mediaPosterUrl(item) || undefined}
                            src={mediaPlaybackUrl(item)}
                            style={styles.cardThumbnailVideo}
                            onLoadedMetadata={(event) => {
                              const preview = event.currentTarget;

                              try {
                                const duration = Number(
                                  preview.duration
                                );
                                const previewTime =
                                  Number.isFinite(duration) &&
                                  duration > 0
                                    ? Math.min(
                                        1,
                                        duration / 20
                                      )
                                    : 0.25;

                                preview.currentTime =
                                  previewTime;
                              } catch {}
                            }}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        )}

                        <div style={styles.cardThumbnailShade} />

                        <div
                          style={{
                            ...styles.playCircle,
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          {isPlexExternalRedirectItem(item)
                            ? "↗"
                            : "▶"}
                        </div>
                      </div>

                      <div style={styles.cardBody}>
                        <div style={styles.cardCategory}>
                          {isPlexExternalRedirectItem(item)
                            ? item.category ||
                              "External Viewing Guide"
                            : "On Demand"}
                        </div>
                        <h3 style={styles.cardTitle}>
                          {item.title || "AGV Network Program"}
                        </h3>
                        <p style={styles.cardDescription}>
                          {item.description ||
                            "AGV Network On Demand presentation."}
                        </p>
                        <div style={styles.availableLabel}>
                          {isPlexExternalRedirectItem(item)
                            ? item.buttonLabel ||
                              "View on Plex"
                            : "Available Now"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={styles.messageBox}>
                  No On Demand programs are currently available.
                </div>
              )}
            </section>
          </>
        ) : null}

        {activeSection === "live" ? (
          <section
            style={{
              ...styles.viewerSection,
              padding: isMobile
                ? "16px 12px"
                : styles.viewerSection.padding,
              borderRadius: isMobile
                ? 18
                : styles.viewerSection.borderRadius,
            }}
          >
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionEyebrow}>AGV NETWORK</div>
                <h2 style={styles.sectionTitle}>Live Stations</h2>
              </div>

              <button
                type="button"
                style={styles.textButton}
                onClick={loadStations}
                disabled={stationsLoading}
              >
                {stationsLoading ? "Refreshing..." : "Refresh stations"}
              </button>
            </div>

            {stationsError ? (
              <div style={styles.errorBox}>{stationsError}</div>
            ) : null}

            {selectedStation ? (
              <div
                style={{
                  ...styles.playerLayout,
                  gridTemplateColumns:
                    isMobile || isTablet
                      ? "minmax(0, 1fr)"
                      : styles.playerLayout.gridTemplateColumns,
                }}
              >
                <div
                  style={{
                    ...styles.playerPanel,
                    padding: isMobile
                      ? 10
                      : styles.playerPanel.padding,
                    borderRadius: isMobile
                      ? 14
                      : styles.playerPanel.borderRadius,
                  }}
                >
                  <div style={styles.playerHeader}>
                    <span style={styles.livePill}>
                      {selectedStation.badge || "LIVE"}
                    </span>
                    <span>
                      {selectedStation.schedule || "24/7"} broadcast
                    </span>
                  </div>

                  <div style={styles.videoFrame}>
                    <iframe
                      key={selectedStation.id}
                      title={selectedStation.title}
                      src={stationEmbedUrl(selectedStation)}
                      style={styles.iframe}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>

                  <h3 style={styles.playerTitle}>
                    {selectedStation.title}
                  </h3>

                  <p style={styles.playerDescription}>
                    {selectedStation.description}
                  </p>

                  <div style={styles.attribution}>
                    Provider:{" "}
                    {selectedStation.provider ||
                      selectedStation.source ||
                      "External provider"}
                  </div>
                </div>

                <aside
                  style={{
                    ...styles.catalogPanel,
                    position: "relative",
                    maxHeight: isMobile ? "none" : "70vh",
                    overflowY: "auto",
                  }}
                >
                  <div style={styles.catalogTitle}>Choose a station</div>

                  {stations.map((station) => {
                    const active =
                      station.id === selectedStation?.id;

                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setSelectedStation(station)}
                        style={
                          active
                            ? styles.catalogButtonActive
                            : styles.catalogButton
                        }
                      >
                        <div style={styles.catalogButtonTitle}>
                          {station.title}
                        </div>
                        <div style={styles.catalogButtonMeta}>
                          {station.category} •{" "}
                          {station.healthStatus || "Available"}
                        </div>
                      </button>
                    );
                  })}
                </aside>
              </div>
            ) : !stationsLoading ? (
              <div style={styles.messageBox}>
                No approved live stations are currently available.
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === "ondemand" ? (
          <section
            style={{
              ...styles.viewerSection,
              padding: isMobile
                ? "16px 12px"
                : styles.viewerSection.padding,
              borderRadius: isMobile
                ? 18
                : styles.viewerSection.borderRadius,
            }}
          >
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionEyebrow}>AGV NETWORK</div>
                <h2 style={styles.sectionTitle}>On Demand</h2>
              </div>

              <button
                type="button"
                style={styles.textButton}
                onClick={loadOnDemand}
                disabled={mediaLoading}
              >
                {mediaLoading ? "Refreshing..." : "Refresh programs"}
              </button>
            </div>

            {mediaError ? (
              <div style={styles.errorBox}>{mediaError}</div>
            ) : null}

            {selectedMedia ? (
              <div
                style={{
                  ...styles.playerLayout,
                  gridTemplateColumns:
                    isMobile || isTablet
                      ? "minmax(0, 1fr)"
                      : styles.playerLayout.gridTemplateColumns,
                }}
              >
                <div
                  style={{
                    ...styles.playerPanel,
                    padding: isMobile
                      ? 10
                      : styles.playerPanel.padding,
                    borderRadius: isMobile
                      ? 14
                      : styles.playerPanel.borderRadius,
                  }}
                >
                  <div style={styles.playerHeader}>
                    <span style={styles.onDemandPill}>ON DEMAND</span>
                    <span>
                      {isPlexExternalRedirectItem(
                        selectedMedia
                      )
                        ? "External link-only listing"
                        : "Founder-approved public program"}
                    </span>
                  </div>

                  {isPlexExternalRedirectItem(
                    selectedMedia
                  ) ? (
                    <div
                      style={{
                        minHeight: isMobile
                          ? 250
                          : 360,
                        display: "grid",
                        alignContent: "center",
                        justifyItems: "center",
                        gap: 14,
                        padding: isMobile
                          ? 20
                          : 34,
                        borderRadius: 16,
                        border:
                          "1px solid rgba(250,204,21,0.34)",
                        background:
                          "radial-gradient(circle at top, rgba(229,160,13,0.18), rgba(2,6,23,0.95) 68%)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 18,
                          border:
                            "1px solid rgba(250,204,21,0.48)",
                          background:
                            "rgba(15,23,42,0.8)",
                          color: "#fbbf24",
                          fontWeight: 950,
                          letterSpacing: "0.08em",
                        }}
                      >
                        PLEX
                      </div>

                      <div
                        style={{
                          color: "#fde68a",
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        External Viewing Guide
                      </div>

                      <div
                        style={{
                          maxWidth: 560,
                          color: "#cbd5e1",
                          fontSize: 13,
                          lineHeight: 1.65,
                        }}
                      >
                        This title is listed by AGV
                        for discovery only. AGV does
                        not host, embed, download or
                        play this program. Viewing
                        availability is controlled by
                        Plex and its listed providers.
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openPlexExternalRedirect(
                            selectedMedia
                          )
                        }
                        style={{
                          marginTop: 4,
                          padding:
                            "12px 22px",
                          borderRadius: 10,
                          border:
                            "1px solid rgba(250,204,21,0.72)",
                          background:
                            "linear-gradient(135deg, #facc15, #a16207)",
                          color: "#111827",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {selectedMedia.buttonLabel ||
                          "View on Plex"} ↗
                      </button>

                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: 11,
                        }}
                      >
                        Opens an external Plex page
                        in a separate browser tab.
                      </div>
                    </div>
                  ) : isYouTubeOnDemandItem(
                    selectedMedia
                  ) ? (
                    <div style={styles.videoFrame}>
                      <iframe
                        key={selectedMedia.intakeId}
                        title={
                          selectedMedia.title ||
                          "AGV Network YouTube program"
                        }
                        src={mediaYouTubeEmbedUrl(
                          selectedMedia
                        )}
                        style={styles.iframe}
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      key={selectedMedia.intakeId}
                      controls
                      playsInline
                      preload="metadata"
                      src={mediaPlaybackUrl(
                        selectedMedia
                      )}
                      style={styles.video}
                    />
                  )}

                  <h3 style={styles.playerTitle}>
                    {selectedMedia.title || "AGV Network Program"}
                  </h3>

                  <p style={styles.playerDescription}>
                    {selectedMedia.description ||
                      "AGV Network On Demand presentation."}
                  </p>

                  <div style={styles.attribution}>
                    Attribution:{" "}
                    {selectedMedia.attribution || "AGV Network"}
                  </div>
                </div>

                <aside
                  style={{
                    ...styles.catalogPanel,
                    position: "relative",
                    maxHeight: isMobile ? "none" : "70vh",
                    overflowY: "auto",
                  }}
                >
                  <div style={styles.catalogTitle}>Choose a program</div>

                  {mediaItems.map((item) => {
                    const active =
                      item.intakeId === selectedMedia?.intakeId;

                    return (
                      <button
                        key={item.intakeId}
                        type="button"
                        onClick={() => openOnDemand(item)}
                        style={
                          active
                            ? styles.catalogButtonActive
                            : styles.catalogButton
                        }
                      >
                        <div style={styles.catalogButtonTitle}>
                          {item.title || "AGV Network Program"}
                        </div>
                        <div style={styles.catalogButtonMeta}>
                          {isPlexExternalRedirectItem(item)
                            ? item.buttonLabel ||
                              "View on Plex"
                            : "Available Now"}
                        </div>
                      </button>
                    );
                  })}
                </aside>
              </div>
            ) : !mediaLoading ? (
              <div style={styles.messageBox}>
                No public On Demand programs are currently available.
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === "news" ? (
          <EmptySection
            title="AGV Network News"
            description="Independent reporting, public briefings and approved news partners will appear here."
          />
        ) : null}

        {activeSection === "education" ? (
          <EmptySection
            title="AGV Network Education"
            description="Teaching, training and University Pal programming will appear here."
          />
        ) : null}

        {activeSection === "archives" ? (
          <EmptySection
            title="AGV Network Archives"
            description="Rights-cleared historical, public-domain and preserved media will appear here."
          />
        ) : null}
      </main>

      <footer style={styles.footer}>
        <strong>AGV Network</strong>
        <span>Founder-controlled public media and live viewing</span>
      </footer>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #17233d 0%, #080b12 40%, #04060a 100%)",
    color: "#f8fafc",
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
  },
  header: {
    padding: "16px clamp(18px, 4vw, 48px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(4,7,13,0.94)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 17,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #d4af37, #8a6d1d)",
    color: "#111827",
    fontWeight: 950,
    fontSize: 19,
  },
  brandTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 950,
  },
  brandSubtitle: {
    marginTop: 3,
    color: "rgba(248,250,252,0.58)",
    fontSize: 12,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid rgba(34,197,94,0.28)",
    background: "rgba(34,197,94,0.11)",
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: 850,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#22c55e",
    boxShadow: "0 0 12px rgba(34,197,94,0.8)",
  },
  homeButton: {
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 13,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.06)",
    color: "#f8fafc",
    fontWeight: 850,
    cursor: "pointer",
  },
  navigation: {
    padding: "12px clamp(18px, 4vw, 48px)",
    display: "flex",
    gap: 8,
    overflowX: "auto",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(8,12,21,0.88)",
  },
  navButton: {
    flex: "0 0 auto",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 999,
    padding: "10px 15px",
    background: "rgba(255,255,255,0.04)",
    color: "#cbd5e1",
    fontWeight: 850,
    cursor: "pointer",
  },
  navButtonActive: {
    flex: "0 0 auto",
    border: "1px solid rgba(250,204,21,0.48)",
    borderRadius: 999,
    padding: "10px 15px",
    background: "rgba(250,204,21,0.14)",
    color: "#fde68a",
    fontWeight: 950,
    cursor: "pointer",
  },
  main: {
    width: "min(1380px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "28px 0 54px",
  },
  hero: {
    padding: "clamp(24px, 5vw, 54px)",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(260px, 0.8fr)",
    gap: 28,
    alignItems: "center",
    borderRadius: 28,
    border: "1px solid rgba(212,175,55,0.34)",
    background:
      "linear-gradient(135deg, rgba(24,40,72,0.98), rgba(11,17,30,0.97) 60%, rgba(72,45,12,0.75))",
    boxShadow: "0 28px 90px rgba(0,0,0,0.34)",
  },
  eyebrow: {
    color: "#facc15",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: "0.16em",
  },
  heroTitle: {
    margin: "10px 0 0",
    fontSize: "clamp(36px, 6vw, 68px)",
    lineHeight: 0.98,
    fontWeight: 950,
  },
  heroText: {
    maxWidth: 720,
    margin: "18px 0 0",
    color: "#cbd5e1",
    lineHeight: 1.7,
    fontSize: 17,
  },
  heroButtons: {
    marginTop: 24,
    display: "flex",
    gap: 11,
    flexWrap: "wrap",
  },
  primaryButton: {
    border: 0,
    borderRadius: 14,
    padding: "13px 17px",
    background: "linear-gradient(135deg, #d4af37, #8a6d1d)",
    color: "#111827",
    fontWeight: 950,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: "13px 17px",
    background: "rgba(255,255,255,0.07)",
    color: "#f8fafc",
    fontWeight: 900,
    cursor: "pointer",
  },
  heroMetrics: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  metric: {
    minHeight: 105,
    padding: 14,
    display: "grid",
    alignContent: "center",
    gap: 6,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(2,6,23,0.42)",
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  metricValue: {
    fontSize: 31,
    color: "#f8fafc",
  },
  metricSmall: {
    fontSize: 20,
    color: "#bbf7d0",
  },
  section: {
    marginTop: 30,
  },
  viewerSection: {
    padding: "22px",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(9,14,25,0.92)",
  },
  sectionHeader: {
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 14,
    flexWrap: "wrap",
  },
  sectionEyebrow: {
    color: "#facc15",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: "0.14em",
  },
  sectionTitle: {
    margin: "5px 0 0",
    fontSize: 30,
    fontWeight: 950,
  },
  textButton: {
    border: 0,
    background: "transparent",
    color: "#93c5fd",
    fontWeight: 900,
    cursor: "pointer",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(245px, 1fr))",
    gap: 16,
  },
  contentCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(15,23,42,0.78)",
    color: "#f8fafc",
    textAlign: "left",
    cursor: "pointer",
  },
  cardThumbnailImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
    zIndex: 0,
  },
  cardThumbnailVideo: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
    pointerEvents: "none",
    zIndex: 0,
    background: "#020617",
  },
  cardThumbnailShade: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    pointerEvents: "none",
    background:
      "linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.2) 48%, rgba(2,6,23,0.78))",
  },
  liveCardVisual: {
    minHeight: 150,
    padding: 14,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at center, rgba(37,99,235,0.34), rgba(2,6,23,0.96))",
  },
  onDemandVisual: {
    minHeight: 150,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at center, rgba(212,175,55,0.3), rgba(2,6,23,0.96))",
  },
  livePill: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    background: "#dc2626",
    color: "#fff",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: "0.08em",
  },
  onDemandPill: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    background: "rgba(212,175,55,0.2)",
    border: "1px solid rgba(212,175,55,0.38)",
    color: "#fde68a",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: "0.08em",
  },
  visualLogo: {
    width: 70,
    height: 70,
    borderRadius: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #d4af37, #8a6d1d)",
    color: "#111827",
    fontWeight: 950,
    fontSize: 22,
  },
  playCircle: {
    width: 66,
    height: 66,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(250,204,21,0.16)",
    border: "1px solid rgba(250,204,21,0.42)",
    color: "#fde68a",
    fontSize: 24,
  },
  cardBody: {
    padding: 16,
  },
  cardCategory: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.09em",
  },
  cardTitle: {
    margin: "7px 0 0",
    fontSize: 20,
    fontWeight: 950,
  },
  cardDescription: {
    minHeight: 42,
    margin: "8px 0 0",
    color: "#94a3b8",
    lineHeight: 1.5,
    fontSize: 13,
  },
  cardFooter: {
    marginTop: 13,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "#cbd5e1",
    fontSize: 11,
  },
  availableLabel: {
    marginTop: 12,
    color: "#86efac",
    fontSize: 11,
    fontWeight: 950,
  },
  playerLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(230px, 0.62fr)",
    gap: 18,
    alignItems: "start",
  },
  playerPanel: {
    minWidth: 0,
    padding: 16,
    borderRadius: 20,
    border: "1px solid rgba(96,165,250,0.22)",
    background: "rgba(2,6,23,0.5)",
  },
  playerHeader: {
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#cbd5e1",
    fontSize: 12,
  },
  videoFrame: {
    aspectRatio: "16 / 9",
    overflow: "hidden",
    borderRadius: 16,
    background: "#000",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: 0,
    display: "block",
  },
  video: {
    display: "block",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 16,
    background: "#000",
  },
  playerTitle: {
    margin: "16px 0 0",
    fontSize: 27,
    fontWeight: 950,
  },
  playerDescription: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    lineHeight: 1.65,
  },
  attribution: {
    marginTop: 11,
    color: "#93c5fd",
    fontSize: 12,
  },
  catalogPanel: {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(15,23,42,0.78)",
  },
  catalogTitle: {
    marginBottom: 10,
    fontWeight: 950,
  },
  catalogButton: {
    width: "100%",
    marginTop: 8,
    padding: 12,
    borderRadius: 13,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#f8fafc",
    textAlign: "left",
    cursor: "pointer",
  },
  catalogButtonActive: {
    width: "100%",
    marginTop: 8,
    padding: 12,
    borderRadius: 13,
    border: "1px solid rgba(250,204,21,0.48)",
    background: "rgba(250,204,21,0.12)",
    color: "#f8fafc",
    textAlign: "left",
    cursor: "pointer",
  },
  catalogButtonTitle: {
    fontWeight: 900,
  },
  catalogButtonMeta: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 11,
  },
  messageBox: {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(2,6,23,0.4)",
    color: "#94a3b8",
  },
  errorBox: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(248,113,113,0.38)",
    background: "rgba(127,29,29,0.18)",
    color: "#fecaca",
  },
  emptySection: {
    minHeight: 420,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(9,14,25,0.92)",
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #d4af37, #8a6d1d)",
    color: "#111827",
    fontSize: 22,
    fontWeight: 950,
  },
  emptyTitle: {
    margin: "18px 0 0",
    fontSize: 32,
  },
  emptyDescription: {
    maxWidth: 620,
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  managedBadge: {
    marginTop: 12,
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.3)",
    background: "rgba(250,204,21,0.1)",
    color: "#fde68a",
    fontSize: 11,
    fontWeight: 900,
  },
  footer: {
    padding: "20px clamp(18px, 4vw, 48px)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    color: "#94a3b8",
    fontSize: 12,
  },
};
