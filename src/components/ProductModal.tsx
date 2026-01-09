'use client';

// ============================================
// PRODUCT MODAL - Reusable bottom sheet modal
// Used in menu page and cart drawer
// ============================================

import { useState } from 'react';
import Image from 'next/image';
import {
    useCartStore,
    type Product,
    type ProductVariation,
} from '@/lib/store';
import { IconClose } from '@/lib/icons';

interface ProductModalProps {
    product: Product;
    onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
    const [selectedVariation, setSelectedVariation] = useState<ProductVariation>(
        product.variations[0]
    );
    const [quantity, setQuantity] = useState(1);
    const [isClosing, setIsClosing] = useState(false);
    const addItem = useCartStore(state => state.addItem);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const handleAddToCart = () => {
        for (let i = 0; i < quantity; i++) {
            addItem(product, selectedVariation);
        }
        handleClose();
    };

    return (
        <>
            {/* Backdrop with smooth fade animation */}
            <div
                className={`modal-overlay ${isClosing ? 'closing' : ''}`}
                onClick={handleClose}
            />

            {/* Modal Sheet */}
            <div className={`modal-sheet ${isClosing ? 'closing' : ''}`}>
                <button
                    onClick={handleClose}
                    className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md"
                >
                    <IconClose className="w-5 h-5" />
                </button>

                <div className="h-48 sm:h-56 relative">
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="100vw"
                    />
                </div>

                <div className="p-5">
                    <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
                    <p className="text-[var(--text-secondary)] text-sm mb-4">
                        from ${product.basePrice.toFixed(2)}
                    </p>
                    <p className="text-[var(--text-secondary)] text-sm mb-6">
                        {product.description}
                    </p>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Variation</h3>
                            <span className="text-xs bg-[var(--text-primary)] text-white px-2 py-1 rounded-full">
                                Required
                            </span>
                        </div>

                        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                            {product.variations.map(variation => (
                                <label
                                    key={variation.name}
                                    className={`flex items-center justify-between px-5 py-4 cursor-pointer border-b border-[var(--border-light)] last:border-b-0 transition-colors ${selectedVariation.name === variation.name
                                        ? 'bg-[var(--primary-light)]'
                                        : 'hover:bg-[var(--background)]'
                                        }`}
                                >
                                    <span className="font-medium">{variation.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[var(--text-secondary)]">
                                            ${variation.price.toFixed(2)}
                                        </span>
                                        <div className={`w-5 h-5 rounded-full border-2 transition-all ${selectedVariation.name === variation.name
                                            ? 'border-[var(--primary)] border-[5px]'
                                            : 'border-[var(--border)]'
                                            }`} />
                                    </div>
                                    <input
                                        type="radio"
                                        name="variation"
                                        className="sr-only"
                                        checked={selectedVariation.name === variation.name}
                                        onChange={() => setSelectedVariation(variation)}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

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

                        <button className="btn-primary flex-1" onClick={handleAddToCart}>
                            Add to cart · ${(selectedVariation.price * quantity).toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
