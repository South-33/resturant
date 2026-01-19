// ============================================
// SVG ICONS - Professional icon set
// ============================================

import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

// Category Icons
export function IconFire({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.524 1.354-4.878 2.853-6.854.754-.994 1.53-1.897 2.147-2.709.398-.524.723-.988.947-1.388l.553-.99.553.99c.224.4.549.864.947 1.388.617.812 1.393 1.715 2.147 2.709C16.646 11.122 18 13.476 18 16c0 3.866-3.134 7-7 7zm0-13.765c-.248.353-.503.708-.76 1.064C9.894 12.176 7 15.157 7 16c0 2.757 2.243 5 5 5s5-2.243 5-5c0-.843-2.894-3.824-4.24-5.701A42.6 42.6 0 0012 9.235z" />
        </svg>
    );
}

export function IconCoffee({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="2" x2="6" y2="4" />
            <line x1="10" y1="2" x2="10" y2="4" />
            <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
    );
}

export function IconTea({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M9 2h6l1.5 3H7.5L9 2z" />
            <path d="M7.5 5h9a2 2 0 0 1 2 2v8a4 4 0 0 1-4 4h-5a4 4 0 0 1-4-4V7a2 2 0 0 1 2-2z" />
            <path d="M18.5 9H20a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1.5" />
        </svg>
    );
}

export function IconCup({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M6 8h12l-1 12H7L6 8z" />
            <path d="M5 8h14" />
            <path d="M9 8V6a3 3 0 1 1 6 0v2" />
        </svg>
    );
}

export function IconFood({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M3 11h18" />
            <path d="M5 11c0-4 3-7 7-7s7 3 7 7" />
            <path d="M6 11v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-9" />
        </svg>
    );
}

export function IconMenu({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

export function IconDoor({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M3 3h18v18H3z" />
            <path d="M9 3v18" />
            <path d="M15 11v2" />
        </svg>
    );
}

export function IconTable({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 3v18" />
            <path d="M3 8h18" />
            <path d="M3 3h18v18H3z" />
            <path d="M3 13h18" />
        </svg>
    );
}

// UI Icons
export function IconCart({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
    );
}

export function IconSearch({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

export function IconClose({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export function IconArrowLeft({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </svg>
    );
}

export function IconCheck({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

export function IconTrash({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );
}

export function IconStar({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}

export function IconChef({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6V13.87Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
        </svg>
    );
}

export function IconStore({ className = 'w-5 h-5', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

export function IconPlus({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

export function IconEdit({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

export function IconMinus({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

// Helper function to get category icon component
export function getCategoryIcon(categoryName: string, className?: string) {
    const props = { className: className || 'w-4 h-4' };
    const name = categoryName.toLowerCase();

    if (name === 'popular' || name.includes('fire')) {
        return <IconFire {...props} />;
    }
    if (name.includes('coffee')) {
        return <IconCoffee {...props} />;
    }
    if (name.includes('tea')) {
        return <IconTea {...props} />;
    }
    if (name.includes('juice') || name.includes('smoothie')) {
        return <IconCup {...props} />;
    }
    if (name.includes('food') || name.includes('snack') || name.includes('cake')) {
        return <IconFood {...props} />;
    }
    // Default
    return <IconCoffee {...props} />;
}
