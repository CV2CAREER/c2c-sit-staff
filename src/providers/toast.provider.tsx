import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { BiCheckCircle, BiX } from "react-icons/bi";
import { BsInfo } from "react-icons/bs";
import { FiAlertCircle, FiAlertTriangle } from "react-icons/fi";

interface ToastType {
  id: number;
  message: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
}

interface ToastContextType {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProps {
  id: number;
  message: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
}

const Toast = ({
  message,
  description,
  type = "info",
  onClose,
  duration = 5000,
}: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - 100 / (duration / 50)));
    }, 50);

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration, onClose]);

  const configs = {
    success: {
      icon: BiCheckCircle,
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      descText: "text-emerald-700",
      iconColor: "text-emerald-500",
    },
    error: {
      icon: FiAlertCircle,
      gradient: "from-rose-500 to-pink-500",
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-900",
      descText: "text-rose-700",
      iconColor: "text-rose-500",
    },
    warning: {
      icon: FiAlertTriangle,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      descText: "text-amber-700",
      iconColor: "text-amber-500",
    },
    info: {
      icon: BsInfo,
      gradient: "from-blue-500 to-indigo-500",
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      descText: "text-blue-700",
      iconColor: "text-blue-500",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={`
       w-72 md:w-96 rounded-2xl shadow-2xl backdrop-blur-sm
        border md:border-2 ${config.border} bg-white
        transform transition-all duration-300 ease-out
        ${
          isExiting
            ? "translate-x-[500px] opacity-0"
            : "translate-x-0 opacity-100"
        }
        mb-4
      `}
    >
      <div className="relative overflow-hidden rounded-2xl">
        <div className={`absolute inset-0 bg-white opacity-5`} />

        <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
          <div
            className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-50 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="relative p-4 flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="relative">
              <div
                className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-full opacity-20 animate-ping`}
              />
              <Icon
                className={`md:w-6 md:h-6 w-4 h-4 ${config.iconColor} relative z-10`}
              />
            </div>
          </div>

          <div className="flex-1">
            <div
              className={`${config.text} font-semibold text-xs md:text-sm leading-relaxed`}
            >
              {message}
            </div>
            {description && (
              <div
                className={`${config.descText} text-[10px] md:text-xs mt-1 leading-relaxed`}
              >
                {description}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setIsExiting(true);
              setTimeout(onClose, 300);
            }}
            className={`flex-shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`}
          >
            <BiX className="md:w-5 md:h-5 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const toast: ToastContextType = {
    success: (message: string, description?: string) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message, description, type: "success" },
      ]);
    },
    error: (message: string, description?: string) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message, description, type: "error" },
      ]);
    },
    warning: (message: string, description?: string) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message, description, type: "warning" },
      ]);
    },
    info: (message: string, description?: string) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message, description, type: "info" },
      ]);
    },
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            message={t.message}
            description={t.description}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
