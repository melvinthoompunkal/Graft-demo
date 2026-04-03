import { startTransition, useState } from "react";

import BundlesPage from "./components/BundlesPage.jsx";
import FeatureSidebar from "./components/FeatureSidebar.jsx";
import RepoMapPage from "./components/RepoMapPage.jsx";
import TopNav from "./components/TopNav.jsx";
import TraceWorkspace from "./components/TraceWorkspace.jsx";
import TracesPage from "./components/TracesPage.jsx";

const initialMessage = null;

export default function App() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  const [apiStatus, setApiStatus] = useState("API idle");
  const [message, setMessage] = useState(initialMessage);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [query, setQuery] = useState("How does this feature work?");
  const [currentPage, setCurrentPage] = useState("repositories");

  const [sessionId, setSessionId] = useState(null);
  const [repoName, setRepoName] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [languages, setLanguages] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedFeatureSlug, setSelectedFeatureSlug] = useState(null);
  const [traces, setTraces] = useState({});

  const selectedFeature = features.find((feature) => feature.slug === selectedFeatureSlug) || null;
  const selectedTrace = selectedFeatureSlug ? traces[selectedFeatureSlug] : null;

  const isLoading = apiStatus === "API ingesting";
  const isTracing = apiStatus === "API tracing";
  const isBundling = apiStatus === "API bundling";

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      let payload = { detail: "Request failed." };
      try {
        payload = await response.json();
      } catch {
        payload = { detail: response.statusText || "Request failed." };
      }
      throw new Error(payload.detail || payload.error || "Request failed.");
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response;
  }

  function clearMessage() {
    setMessage(initialMessage);
  }

  function showError(error) {
    setMessage({ kind: "error", text: error.message || "Request failed." });
  }

  function showSuccess(text) {
    setMessage({ kind: "success", text });
  }

  async function handleIngest(event) {
    event.preventDefault();
    clearMessage();
    setApiStatus("API ingesting");

    try {
      const payload = await request("/api/repo/ingest", {
        method: "POST",
        body: JSON.stringify({
          github_url: githubUrl.trim(),
          github_token: githubToken.trim() || null,
        }),
      });

      const owner = githubUrl.trim().split("/")[3] || "";
      startTransition(() => {
        setSessionId(payload.session_id);
        setRepoName(payload.repo_name);
        setRepoOwner(owner);
        setFileCount(payload.file_count || 0);
        setLanguages(payload.languages_detected || []);
        setFeatures(payload.features || []);
        setSelectedFeatureSlug(payload.features?.[0]?.slug || null);
        setTraces({});
      });
      showSuccess("Repository ingested. Pick a feature and run a trace.");
    } catch (error) {
      showError(error);
    } finally {
      setApiStatus("API idle");
    }
  }

  async function handleTrace(event) {
    event.preventDefault();

    if (!sessionId || !selectedFeatureSlug) {
      showError(new Error("Ingest a repository and select a feature before tracing."));
      return;
    }

    clearMessage();
    setApiStatus("API tracing");

    try {
      const payload = await request("/api/repo/trace", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          feature_slug: selectedFeatureSlug,
          natural_language_query: query.trim(),
        }),
      });

      startTransition(() => {
        setTraces((current) => ({ ...current, [selectedFeatureSlug]: payload }));
      });
      showSuccess("Trace complete. Bundle download is now available.");
    } catch (error) {
      showError(error);
    } finally {
      setApiStatus("API idle");
    }
  }

  async function handleRefresh() {
    if (!sessionId) {
      return;
    }

    setApiStatus("API syncing");
    clearMessage();

    try {
      const payload = await request(`/api/repo/session/${sessionId}`);
      startTransition(() => {
        setRepoName(payload.repo_name);
        setRepoOwner(payload.repo_owner);
        setFileCount(payload.file_count || 0);
        setLanguages(payload.languages_detected || []);
        setFeatures(payload.features || []);
        if (!selectedFeatureSlug && payload.features?.[0]?.slug) {
          setSelectedFeatureSlug(payload.features[0].slug);
        }
      });
      showSuccess("Session metadata refreshed.");
    } catch (error) {
      showError(error);
    } finally {
      setApiStatus("API idle");
    }
  }

  async function handleBundle(featureSlugOverride) {
    const slug = featureSlugOverride || selectedFeatureSlug;
    if (!sessionId || !slug) {
      return;
    }

    setApiStatus("API bundling");
    clearMessage();

    try {
      const response = await request("/api/repo/bundle", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          feature_slug: slug,
        }),
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);

      anchor.href = url;
      anchor.download = match?.[1] || `graft_${repoName}_${slug}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      showSuccess("Bundle downloaded.");
    } catch (error) {
      showError(error);
    } finally {
      setApiStatus("API idle");
    }
  }

  async function handleReset() {
    clearMessage();

    if (sessionId) {
      try {
        await request(`/api/repo/session/${sessionId}`, { method: "DELETE" });
      } catch (error) {
        showError(error);
        return;
      }
    }

    startTransition(() => {
      setGithubUrl("");
      setGithubToken("");
      setQuery("How does this feature work?");
      setSessionId(null);
      setRepoName("");
      setRepoOwner("");
      setFileCount(0);
      setLanguages([]);
      setFeatures([]);
      setSelectedFeatureSlug(null);
      setTraces({});
      setCurrentPage("repositories");
    });
    showSuccess("Workspace reset and backend session removed.");
  }

  const repoTitle = sessionId ? `${repoOwner}/${repoName}` : "Awaiting target repo";
  const repoMeta = sessionId
    ? `${fileCount} files · ${languages.join(", ") || "Unknown languages"}`
    : "Paste a GitHub URL to start tracing.";
  const featureCountLabel = sessionId
    ? `${features.length} feature${features.length === 1 ? "" : "s"} available for tracing.`
    : "No repository ingested yet.";

  function renderPage() {
    switch (currentPage) {
      case "traces":
        return <TracesPage features={features} traces={traces} />;
      case "bundles":
        return (
          <BundlesPage
            features={features}
            traces={traces}
            repoName={repoName}
            repoOwner={repoOwner}
            sessionId={sessionId}
            onBundle={handleBundle}
            isBundling={isBundling}
          />
        );
      case "map":
        return <RepoMapPage features={features} traces={traces} />;
      default:
        return (
          <>
            <FeatureSidebar
              featureCountLabel={featureCountLabel}
              features={features}
              githubToken={githubToken}
              githubUrl={githubUrl}
              isLoading={isLoading}
              message={message}
              onGithubTokenChange={setGithubToken}
              onGithubUrlChange={setGithubUrl}
              onIngest={handleIngest}
              onRefresh={handleRefresh}
              onSelectFeature={setSelectedFeatureSlug}
              repoMeta={repoMeta}
              repoTitle={repoTitle}
              selectedFeatureSlug={selectedFeatureSlug}
              traces={traces}
            />
            <TraceWorkspace
              canBundle={Boolean(selectedTrace)}
              isTracing={isTracing}
              onBundle={() => handleBundle()}
              onQueryChange={setQuery}
              onTrace={handleTrace}
              query={query}
              selectedFeature={selectedFeature}
              session={{
                fileCount,
                languages,
                repoName,
                repoOwner,
                sessionId,
                tracedFeatures: Object.keys(traces),
              }}
              trace={selectedTrace}
            />
          </>
        );
    }
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <TopNav
        apiStatus={apiStatus}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onReset={handleReset}
      />
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden lg:flex-row">
        {renderPage()}
      </main>
    </div>
  );
}
