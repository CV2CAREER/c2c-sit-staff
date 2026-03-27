import React from 'react';

interface Props {
    isOpen: boolean;
    message: string;
    onClose: () => void;
}


const SuccessModal = ({ isOpen, message }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0 animate-scale-up">
                <div className="flex flex-col items-center justify-center space-y-4">
                    {/* Replaced lucide-react icon with inline SVG for better compatibility */}
                    <svg className="text-emerald-500 w-16 h-16 animate-bounce-in" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2l4-4m6 2a9 9 0 11-18 0a9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white text-center">Success!</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center">{message}</p>
                    {/* <button
                        onClick={onClose}
                        className="mt-6 px-6 py-3 bg-blue hover:bg-career-blue-500 text-white font-medium rounded-full shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Continue
                    </button> */}
                </div>
            </div>
            {/* Tailwind CSS animations for better UX */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                .animate-scale-up {
                    animation: scaleUp 0.3s ease-out forwards;
                    animation-delay: 0.1s; /* Slight delay for content */
                }
                .animate-bounce-in {
                    animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </div>
    );
};

export default SuccessModal;