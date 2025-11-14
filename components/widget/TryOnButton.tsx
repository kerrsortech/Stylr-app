'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

interface TryOnButtonProps {
  apiUrl: string;
  sessionId: string;
  shopDomain: string;
  productId: string;
  productImageUrl: string;
  productName?: string;
  productCategory?: string;
  productUrl?: string;
  className?: string;
}

export function TryOnButton({
  apiUrl,
  sessionId,
  shopDomain,
  productId,
  productImageUrl,
  productName,
  productCategory,
  productUrl,
  className,
}: TryOnButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setUserPhoto(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!userPhoto) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Fetch product image
      const productImageResponse = await fetch(productImageUrl);
      const productImageBlob = await productImageResponse.blob();
      const productImageFile = new File([productImageBlob], 'product.jpg', {
        type: 'image/jpeg',
      });

      // Create form data
      const formData = new FormData();
      formData.append('userPhoto', userPhoto);
      formData.append('productImage0', productImageFile);
      formData.append('productImageCount', '1');
      formData.append('productName', productName || 'Product');
      if (productCategory) {
        formData.append('productCategory', productCategory);
      }
      if (productUrl) {
        formData.append('productUrl', productUrl);
      }
      formData.append('sessionId', sessionId);
      formData.append('shopDomain', shopDomain);
      formData.append('productId', productId);

      const response = await fetch(`${apiUrl}/api/try-on`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate try-on image');
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to generate try-on image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn('glass', className)}
        variant="outline"
      >
        <Camera className="h-4 w-4 mr-2" />
        Try Virtual Try-On
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Virtual Try-On</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!generatedImage ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload your photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full"
                    disabled={isGenerating}
                  />
                  {error && (
                    <p className="text-sm text-destructive mt-2">{error}</p>
                  )}
                </div>

                {preview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                  >
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPreview(null);
                        setUserPhoto(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!userPhoto || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Try-On'
                  )}
                </Button>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <img
                  src={generatedImage}
                  alt="Generated try-on"
                  className="w-full rounded-lg"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setGeneratedImage(null);
                      setPreview(null);
                      setUserPhoto(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Try Another
                  </Button>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedImage;
                      link.download = 'try-on.jpg';
                      link.click();
                    }}
                    className="flex-1"
                  >
                    Download
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

