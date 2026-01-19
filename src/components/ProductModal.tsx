'use client';

// ============================================
// PRODUCT MODAL - Reusable bottom sheet modal
// Supports multiple variation groups + notes
// ============================================

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
    useCartStore,
    type Product,
    type SelectedVariation,
    calculateItemPrice,
} from '@/lib/store';
import { IconClose } from '@/lib/icons';

// Helper to validate URL
function isValidUrl(urlString: string): boolean {
    if (!urlString || urlString.trim() === '') return false;
    try {
        new URL(urlString);
        return true;
    } catch {
        return false;
    }
}

interface ProductModalProps {
    product: Product;
    onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
    // Initialize with default options or first option of each required group
    const [selectedVariations, setSelectedVariations] = useState<SelectedVariation[]>(() => {
        const initial: SelectedVariation[] = [];
        
        // Only process if variationGroups exists
        if (product.variationGroups && product.variationGroups.length > 0) {
            product.variationGroups.forEach(group => {
                // For required groups, select default or first option
                if (group.required && group.options.length > 0) {
                    // Check if defaultOption is specified and exists
                    let defaultOption = group.options[0];
                    if (group.defaultOption) {
                        const foundDefault = group.options.find(opt => opt.name === group.defaultOption);
                        if (foundDefault) {
                            defaultOption = foundDefault;
                        }
                    }
                    
                    initial.push({
                        groupName: group.name,
                        optionName: defaultOption.name,
                        priceAdjustment: defaultOption.priceAdjustment,
                    });
                }
                // For optional groups, select default if specified
                else if (!group.required && group.defaultOption) {
                    const defaultOpt = group.options.find(opt => opt.name === group.defaultOption);
                    if (defaultOpt) {
                        initial.push({
                            groupName: group.name,
                            optionName: defaultOpt.name,
                            priceAdjustment: defaultOpt.priceAdjustment,
                        });
                    }
                }
            });
        }
        
        return initial;
    });
    
    const [notes, setNotes] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isClosing, setIsClosing] = useState(false);
    const addItem = useCartStore(state => state.addItem);

    // Calculate total price
    const itemPrice = useMemo(() => {
        return calculateItemPrice(product.basePrice, selectedVariations);
    }, [product.basePrice, selectedVariations]);

    const totalPrice = itemPrice * quantity;

    // Check if all required groups have selections
    const allRequiredSelected = useMemo(() => {
        if (!product.variationGroups || product.variationGroups.length === 0) {
            return true; // No variation groups = always valid
        }
        
        return product.variationGroups
            .filter(g => g.required)
            .every(group => 
                selectedVariations.some(s => s.groupName === group.name)
            );
    }, [product.variationGroups, selectedVariations]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const handleSelectOption = (groupName: string, option: { name: string; priceAdjustment: number }) => {
        setSelectedVariations(prev => {
            // Remove existing selection for this group
            const filtered = prev.filter(s => s.groupName !== groupName);
            // Add new selection
            return [...filtered, {
                groupName,
                optionName: option.name,
                priceAdjustment: option.priceAdjustment,
            }];
        });
    };

    const handleToggleOption = (groupName: string, option: { name: string; priceAdjustment: number }) => {
        setSelectedVariations(prev => {
            const existing = prev.find(s => s.groupName === groupName && s.optionName === option.name);
            if (existing) {
                // Remove if already selected (for optional groups)
                return prev.filter(s => !(s.groupName === groupName && s.optionName === option.name));
            } else {
                // Add selection (replacing any existing for this group in single-select)
                const filtered = prev.filter(s => s.groupName !== groupName);
                return [...filtered, {
                    groupName,
                    optionName: option.name,
                    priceAdjustment: option.priceAdjustment,
                }];
            }
        });
    };

    const handleAddToCart = () => {
        if (!allRequiredSelected) return;
        
        for (let i = 0; i < quantity; i++) {
            addItem(product, selectedVariations, notes || undefined);
        }
        handleClose();
    };

    const isOptionSelected = (groupName: string, optionName: string) => {
        return selectedVariations.some(s => s.groupName === groupName && s.optionName === optionName);
    };

    return (
        <>
            {/* Backdrop with smooth fade animation */}
            <div
                className={`modal-overlay ${isClosing ? 'closing' : ''}`}
                onClick={handleClose}
            />

            {/* Modal Sheet */}
            <div className={`modal-sheet flex flex-col ${isClosing ? 'closing' : ''}`}>
                <button
                    onClick={handleClose}
                    className="absolute top-4 left-4 z-20 w-11 h-11 flex items-center justify-center bg-white rounded-full shadow-md active:scale-90 transition-transform touch-manipulation"
                >
                    <IconClose className="w-5 h-5" />
                </button>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="h-48 sm:h-56 relative bg-stone-100">
                        {product.imageUrl && isValidUrl(product.imageUrl) ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="100vw"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-7xl">
                                📦
                            </div>
                        )}
                    </div>

                    <div className="p-5">
                        <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
                        <p className="text-[var(--text-secondary)] text-sm mb-4">
                            from ${product.basePrice.toFixed(2)}
                        </p>
                        <p className="text-[var(--text-secondary)] text-sm mb-6">
                            {product.description}
                        </p>

                        {/* Variation Groups */}
                        {product.variationGroups && product.variationGroups.length > 0 && product.variationGroups.map(group => (
                            <div key={group.name} className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold">{group.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${group.required
                                            ? 'bg-[var(--text-primary)] text-white'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {group.required ? 'Required' : 'Optional'}
                                    </span>
                                </div>

                                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                                    {group.options.map(option => {
                                        const isSelected = isOptionSelected(group.name, option.name);
                                        return (
                                            <button
                                                key={option.name}
                                                type="button"
                                                className={`w-full flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)] last:border-b-0 transition-colors touch-manipulation text-left
                                                ${isSelected
                                                        ? 'bg-pink-50'
                                                        : 'hover:bg-[var(--background)] active:bg-[var(--background)]'
                                                    }`}
                                                onClick={() => {
                                                    if (group.required) {
                                                        handleSelectOption(group.name, option);
                                                    } else {
                                                        handleToggleOption(group.name, option);
                                                    }
                                                }}
                                            >
                                                <span className="font-medium">{option.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[var(--text-secondary)]">
                                                        {option.priceAdjustment > 0
                                                            ? `+$${option.priceAdjustment.toFixed(2)}`
                                                            : option.priceAdjustment < 0
                                                                ? `-$${Math.abs(option.priceAdjustment).toFixed(2)}`
                                                                : '$0.00'
                                                        }
                                                    </span>
                                                    <div className={`w-5 h-5 rounded-full border-2 transition-all ${isSelected
                                                            ? 'border-[var(--primary)] border-[5px]'
                                                            : 'border-[var(--border)]'
                                                        }`} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Notes Section */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-3">Special Instructions</h3>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add a note (e.g., allergies, preferences...)"
                                className="w-full p-4 border border-[var(--border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--primary)]"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="p-5 border-t border-[var(--border-light)] bg-white/80 backdrop-blur-md sticky bottom-0">
                    <div className="flex items-center gap-4 safe-bottom">
                        <div className="quantity-control">
                            <button
                                className="quantity-button"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            >
                                −
                            </button>
                            <span className="w-8 text-center font-semibold">{quantity}</span>
                            <button
                                className="quantity-button"
                                onClick={() => setQuantity(q => q + 1)}
                            >
                                +
                            </button>
                        </div>

                        <button
                            className="btn-primary flex-1 disabled:opacity-50"
                            onClick={handleAddToCart}
                            disabled={!allRequiredSelected}
                        >
                            Add to cart · ${totalPrice.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
