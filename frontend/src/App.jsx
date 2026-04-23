import { useEffect, useState } from "react";

import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import RepoDetail from "./pages/RepoDetail.jsx";
import TryYourOwn from "./pages/TryYourOwn.jsx";

function useHashRouter() {
  const [route, setRoute] = useState(window.location.hash || "#/");

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

function navigate(hash) {
  window.location.hash = hash;
  window.scrollTo(0, 0);
}

export default function App() {
  const route = useHashRouter();
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";

  function renderPage() {
    if (route === "#/" || route === "") {
      return <LandingPage onNavigate={navigate} />;
    }
    if (route === "#/library") {
      return <LibraryPage apiBase={apiBase} onNavigate={navigate} />;
    }
    if (route.startsWith("#/repo/")) {
      const slug = route.replace("#/repo/", "");
      return <RepoDetail apiBase={apiBase} slug={slug} onNavigate={navigate} />;
    }
    if (route === "#/try") {
      return <TryYourOwn apiBase={apiBase} onNavigate={navigate} />;
    }
    return <LandingPage onNavigate={navigate} />;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar currentRoute={route} onNavigate={navigate} />
      <main className="relative z-10 flex-1">{renderPage()}</main>
      <Footer />
    </div>
  );
}
