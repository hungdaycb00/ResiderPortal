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
    <div className="fixed md:absolute bottom-[64px] md:bottom-6 left-0 right-0 z-[190] px-6 pb-4 md:pb-0 pointer-events-none">
        <div className="flex bg-white/80 backdrop-blur-2xl p-1.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 pointer-events-auto max-w-[400px] mx-auto">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${value === option.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    </div>
);

export default SubTabSwitcher;
