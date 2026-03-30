import React, { ReactNode, useState } from 'react';
import { CircularProgress } from '@mui/material';
import clsx from 'clsx';

interface AnimatedButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    isSuccess?: boolean;
    label: ReactNode;
    loadingLabel?: string;
    successLabel?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger';
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
    onClick,
    isLoading = false,
    isSuccess = false,
    label,
    disabled,
    loadingLabel = "Saving...",
    successLabel = "Saved!",
    fullWidth = false,
    className = '',
    variant = 'primary',
    tooltip,
    tooltipPosition = 'top',
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const variantStyles = {
        primary: 'bg-blue hover:bg-blue-400 text-white',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        danger: 'bg-red-600 hover:bg-red-700 text-white'
    };

    const tooltipPositions = {
        top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => tooltip && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => tooltip && setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
        >
            <button
                disabled={disabled || isLoading}
                onClick={onClick}
                className={clsx(
                    'relative p-2 px-5 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2',
                    variantStyles[variant],
                    {
                        'w-full': fullWidth,
                        'opacity-75 cursor-not-allowed': disabled,
                        'cursor-wait': isLoading,
                        'bg-green-600 hover:bg-green-600': isSuccess,
                    },
                    className
                )}
                aria-label={tooltip}
            >
                {isLoading ? (
                    <>
                        <CircularProgress
                            size={20}
                            thickness={4}
                            className="text-current"
                            sx={{ color: 'inherit' }}
                        />
                        {loadingLabel}
                    </>
                ) : isSuccess ? (
                    <>
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        {successLabel}
                    </>
                ) : (
                    label
                )}
            </button>

            {tooltip && showTooltip && (
                <div
                    className={clsx(
                        'absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-md shadow-sm whitespace-nowrap',
                        tooltipPositions[tooltipPosition]
                    )}
                    role="tooltip"
                >
                    {tooltip}
                    <div className={clsx(
                        'absolute w-2 h-2 bg-gray-800 transform rotate-45',
                        {
                            'top-full left-1/2 -translate-x-1/2 -mt-1': tooltipPosition === 'top',
                            'bottom-full left-1/2 -translate-x-1/2 -mb-1': tooltipPosition === 'bottom',
                            'top-1/2 right-full -translate-y-1/2 -mr-1': tooltipPosition === 'left',
                            'top-1/2 left-full -translate-y-1/2 -ml-1': tooltipPosition === 'right',
                        }
                    )} />
                </div>
            )}
        </div>
    );
};

export default AnimatedButton;