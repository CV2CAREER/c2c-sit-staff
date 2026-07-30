import React, { useState, useEffect } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const MaintenanceScreen = () => {
  const [testPanelUnlocked, setTestPanelUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Keyboard shortcut to unlock test panel: press 't' then 'e' then 's' then 't'
  useEffect(() => {
    let keySequence = "";
    const handleKeyPress = (e: KeyboardEvent) => {
      // Build sequence from key presses
      keySequence += e.key.toLowerCase();
      
      // Keep only last 4 characters
      if (keySequence.length > 4) {
        keySequence = keySequence.slice(-4);
      }
      
      // Check if sequence matches "test"
      if (keySequence === "test") {
        setTestPanelUnlocked(true);
        keySequence = ""; // Reset sequence
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleTestAccess = async () => {
  setIsLoading(true);
  
  // Set bypass cookie directly
  document.cookie = "maintenance_bypass=true; path=/; max-age=86400"; // 1 day
  
  // Also add to URL for immediate effect
  const url = new URL(window.location.href);
  url.searchParams.set("testBypass", "true");
  
  // Navigate to the same URL with bypass parameter
  router.push(url.pathname + url.search);
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="bg-yellow-500/20 p-6 rounded-full">
            <AlertTriangle className="w-16 h-16 text-yellow-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Maintenance Mode
        </h1>

        {/* Subheading */}
        <p className="text-2xl text-slate-300 mb-6 font-light">
          We'll be back shortly
        </p>

        {/* Description */}
        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          We're currently performing scheduled maintenance to improve your experience. 
          We appreciate your patience and will be back online as soon as possible.
        </p>

        {/* Status Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8 backdrop-blur">
          <p className="text-slate-300 mb-2">
            <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
            Status: Under Maintenance
          </p>
          <p className="text-slate-400 text-sm">
            We're working hard to improve your experience. Thank you for your patience!
          </p>
        </div>

        {/* Contact Info */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6">
          <p className="text-slate-300 mb-3 font-medium">Questions?</p>
          <p className="text-slate-400">
            Contact us at{" "}
            <a
              href="mailto:support@cvtocareer.com"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              support@cvtocareer.com
            </a>
          </p>
        </div>

        {/* Test Panel - Unlocked with keyboard shortcut */}
        {testPanelUnlocked && (
          <div className="mt-8 bg-purple-900/20 border border-purple-600/50 rounded-lg p-6 backdrop-blur">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-purple-400" />
              <p className="text-purple-300 font-medium">Test Mode Unlocked</p>
            </div>
            <p className="text-purple-400 text-sm mb-4">
              Click below to bypass maintenance mode for testing
            </p>
            <button
              onClick={handleTestAccess}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-700 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
            >
              {isLoading ? "Loading..." : "Access Test Site"}
            </button>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-slate-500 text-xs mt-8">
          Last updated: {new Date().toLocaleString("en-GB")}
        </p>
      </div>
    </div>
  );
};

export default MaintenanceScreen;