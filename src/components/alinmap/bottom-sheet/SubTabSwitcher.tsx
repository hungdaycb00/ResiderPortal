import type React from 'react';

interface SubTabOption<T extends string> {
    value: T;
    label: string;
}

interface SubTabSwitcherProps<T extends string> {
    value: T;
    options: SubTabOption<T>[];
    onChange: (value: T) => void;
}

const SubTabSwitcher = <T extends string,>({
    value,
    options,
    onChange,
}: SubTabSwitcherProps<T>) => (
    <div className="fixed md:static bottom-[64px] left-0 right-0 z-[190] px-6 pb-4 md:pb-0 pointer-events-none md:pointer-events-auto">
        <div
            className={`grid gap-1.5 bg-white/80 backdrop-blur-2xl p-1.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 pointer-events-auto max-w-[400px] mx-auto ${
                options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
            }`}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                        value === option.value
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    </div>
);

export default SubTabSwitcher;
