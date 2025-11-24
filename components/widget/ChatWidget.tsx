'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Send, X, Minimize2, Maximize2, Loader2, Camera, Upload, Image as ImageIcon, Sparkles, ArrowUp, Lock, Mountain, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getDemoPhotoUrl, DEMO_PORTRAIT_PHOTO_URL, DEMO_STANDING_PHOTO_URL } from '@/lib/config/demo-photos';
import { mapCategoryToType, getCategoryConfig } from '@/lib/try-on/category-system';
import { getAbsoluteImageUrl, getBaseUrl } from '@/lib/utils/url-helper';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  products?: any[];
  imageUrl?: string; // For try-on generated images
}

interface ChatWidgetProps {
  apiUrl: string;
  sessionId: string;
  shopDomain: string;
  currentProduct?: any;
  customerId?: string;
  onClose?: () => void;
}

export function ChatWidget({
  apiUrl,
  sessionId,
  shopDomain,
  currentProduct,
  customerId,
  onClose,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Helper function to proxy S3 images through our API to avoid CORS issues
  const getProxiedImageUrl = (imageUrl: string | undefined): string | undefined => {
    if (!imageUrl) return undefined;
    if (!apiUrl) {
      console.error('apiUrl is not set, cannot proxy image');
      return undefined;
    }
    
    // Don't proxy local public folder images (they start with /)
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
      // Local public folder image - return as-is (Next.js handles it)
      return imageUrl;
    }
    
    // Check if it's an S3 URL that needs proxying
    if (imageUrl.includes('vvapp.s3.ap-south-1.amazonaws.com') || 
        imageUrl.includes('s3.amazonaws.com') ||
        imageUrl.includes('s3.ap-south-1.amazonaws.com')) {
      // Use our proxy endpoint
      const proxiedUrl = `${apiUrl}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      console.log('Proxying S3 URL:', { original: imageUrl, proxied: proxiedUrl });
      return proxiedUrl;
    }
    
    // For other URLs, return as-is
    return imageUrl;
  };

  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [standingPhoto, setStandingPhoto] = useState<File | null>(null);
  const [standingPhotoPreview, setStandingPhotoPreview] = useState<string | null>(null);
  const [standingPhotoS3Url, setStandingPhotoS3Url] = useState<string | null>(null);
  const [standingPhotoUploading, setStandingPhotoUploading] = useState(false);
  const [portraitPhoto, setPortraitPhoto] = useState<File | null>(null);
  const [portraitPhotoPreview, setPortraitPhotoPreview] = useState<string | null>(null);
  const [portraitPhotoS3Url, setPortraitPhotoS3Url] = useState<string | null>(null);
  const [portraitPhotoUploading, setPortraitPhotoUploading] = useState(false);
  
  // Ticket creation state
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<string>('');
  const [ticketMessage, setTicketMessage] = useState<string>('');
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const standingPhotoInputRef = useRef<HTMLInputElement>(null);
  const portraitPhotoInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update product context when currentProduct changes
  useEffect(() => {
    if (currentProduct) {
      console.log('ChatWidget - Current product updated:', {
        id: currentProduct.id,
        title: currentProduct.title || currentProduct.name,
        hasImage: !!currentProduct.image,
        image: currentProduct.image,
      });
    } else {
      console.log('ChatWidget - No current product (on home page)');
    }
  }, [currentProduct]);

  // Load demo photos when try-on dialog opens (for demo purposes)
  useEffect(() => {
    if (isTryOnOpen) {
      console.log('Try-on dialog opened, loading demo photos...', {
        hasPortraitPreview: !!portraitPhotoPreview,
        hasStandingPreview: !!standingPhotoPreview,
        portraitUrl: DEMO_PORTRAIT_PHOTO_URL,
        standingUrl: DEMO_STANDING_PHOTO_URL,
      });
      
      // Always load demo photos when dialog opens (they can be replaced by user uploads)
      // Load portrait photo
      setPortraitPhotoPreview(DEMO_PORTRAIT_PHOTO_URL);
      setPortraitPhotoS3Url(DEMO_PORTRAIT_PHOTO_URL);
      
      // Load standing photo
      setStandingPhotoPreview(DEMO_STANDING_PHOTO_URL);
      setStandingPhotoS3Url(DEMO_STANDING_PHOTO_URL);
      
      // Save demo photo to database for this session
      if (apiUrl && sessionId) {
        fetch(`${apiUrl}/api/update-user-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userPhotoUrl: DEMO_PORTRAIT_PHOTO_URL,
            customerId: customerId || null,
          }),
        }).catch(err => {
          console.warn('Failed to save demo photo to database (non-critical):', err);
        });
      }
      
      console.log('Demo photos loaded:', { 
        portrait: DEMO_PORTRAIT_PHOTO_URL, 
        standing: DEMO_STANDING_PHOTO_URL,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTryOnOpen]);

  // Debug: Log when component renders
  useEffect(() => {
    console.log('ChatWidget mounted and visible', { 
      apiUrl, 
      sessionId, 
      shopDomain, 
      hasProduct: !!currentProduct,
      buttonShouldBeVisible: true 
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const lowerMessage = input.trim().toLowerCase();
    
    // Check if user directly wants to create a ticket - show form immediately
    const directTicketRequest = lowerMessage.includes('create a ticket') || 
                               lowerMessage.includes('create ticket') ||
                               lowerMessage.includes('want to create') ||
                               (lowerMessage.includes('ticket') && (lowerMessage.includes('create') || lowerMessage.includes('need') || lowerMessage.includes('want')));
    
    if (directTicketRequest) {
      setShowTicketForm(true);
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      return; // Don't send to API, just show the form
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMessage.content,
          context: {
            currentProduct,
            shopDomain,
            customerId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Chat API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || `Failed to send message (${response.status})`);
      }

      const data = await response.json();

      // Only include products if API returned them (which should only happen for recommendations/search)
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
        products: data.products && data.products.length > 0 ? data.products : undefined,
      };

      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        
        // Check if API indicates ticket confirmation or ticket creation request
        const shouldShowTicketForm = 
          data.ticketStage === 'awaiting_confirmation' || 
          data.ticketStage === 'create' ||
          (data.wantsTicket && data.ticketStage === 'offer' && userMessage.content.toLowerCase().trim() === 'yes');
        
        // Also check if assistant is asking to create a ticket and user confirmed
        const lowerMessage = userMessage.content.toLowerCase().trim();
        const isTicketConfirmation = lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'sure' || lowerMessage === 'ok' || lowerMessage === 'okay';
        
        // Check previous assistant message for ticket offer
        const previousAssistantMessage = prev.length > 0 ? prev[prev.length - 1] : null;
        const wasAskingForTicket = previousAssistantMessage && (
          previousAssistantMessage.content.toLowerCase().includes('create a support ticket') || 
          previousAssistantMessage.content.toLowerCase().includes('create a ticket') ||
          previousAssistantMessage.content.toLowerCase().includes('support ticket') ||
          previousAssistantMessage.content.toLowerCase().includes('would you like me to do that') ||
          previousAssistantMessage.content.toLowerCase().includes('help you with that') ||
          previousAssistantMessage.content.toLowerCase().includes('can help')
        );
        
        // Also check current message
        const isAskingForTicket = data.message.toLowerCase().includes('create a support ticket') || 
                                  data.message.toLowerCase().includes('create a ticket') ||
                                  data.message.toLowerCase().includes('support ticket') ||
                                  data.message.toLowerCase().includes('fill out the form') ||
                                  data.message.toLowerCase().includes('tell me a bit more about the issue');
        
        // Also check if user's message itself indicates ticket creation
        const userWantsTicket = lowerMessage.includes('create a ticket') || 
                               lowerMessage.includes('create ticket') ||
                               lowerMessage.includes('want to create') ||
                               lowerMessage.includes('need a ticket') ||
                               lowerMessage.includes('support ticket');
        
        if (shouldShowTicketForm || (isTicketConfirmation && (wasAskingForTicket || isAskingForTicket)) || userWantsTicket) {
          setShowTicketForm(true);
        }
        
        return updated;
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTicketSubmit = async () => {
    if (!ticketCategory || !ticketMessage.trim()) {
      return;
    }

    // Hide the form immediately to show loading state
    setShowTicketForm(false);
    
    // Add user message showing what they submitted
    const userTicketMessage: Message = {
      role: 'user',
      content: `Ticket: ${ticketCategory} - ${ticketMessage}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userTicketMessage]);

    try {
      // Call the create-ticket API
      const response = await fetch(`${apiUrl}/api/create-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          shopDomain,
          customerId: customerId || undefined,
          issueCategory: ticketCategory,
          issueDescription: ticketMessage,
          currentProduct: currentProduct || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create ticket' }));
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      const data = await response.json();
      const ticketId = data.ticketId;
      
      // Store ticket ID
      setCreatedTicketId(ticketId);
      
      // Add success message to chat
      const successMessage: Message = {
        role: 'assistant',
        content: `Your ticket (${ticketId}) has been submitted successfully. You will receive a confirmation email soon, and our team will get back to you within 24 hours.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Reset form fields
      setTicketCategory('');
      setTicketMessage('');
      
      // Reset createdTicketId after a delay to allow creating another ticket
      setTimeout(() => {
        setCreatedTicketId(null);
      }, 5000);
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      
      // Show error message
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error while creating your ticket: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Show the form again so user can retry
      setShowTicketForm(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setUserPhoto(file);
      setUserPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleStandingPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

    // Set local preview immediately
      setStandingPhoto(file);
    const localPreview = URL.createObjectURL(file);
    setStandingPhotoPreview(localPreview);
    setStandingPhotoUploading(true);

    try {
      // Upload to S3
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', 'standing');
      formData.append('sessionId', sessionId);
      formData.append('shopDomain', shopDomain); // Include shopDomain for session creation
      if (customerId) {
        formData.append('customerId', customerId);
      }

      const response = await fetch(`${apiUrl}/api/upload-photo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();
      
      // Update preview with S3 URL
      setStandingPhotoS3Url(data.url);
      setStandingPhotoPreview(data.url); // Use S3 URL for preview
      
      console.log('Standing photo uploaded to S3:', data.url);
    } catch (error: any) {
      console.error('Failed to upload standing photo:', error);
      alert(`Failed to upload photo: ${error.message || 'Unknown error'}`);
      // Keep local preview on error
    } finally {
      setStandingPhotoUploading(false);
    }
  };

  const handlePortraitPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

    // Set local preview immediately
      setPortraitPhoto(file);
    const localPreview = URL.createObjectURL(file);
    setPortraitPhotoPreview(localPreview);
    setPortraitPhotoUploading(true);

    try {
      // Upload to S3
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', 'portrait');
      formData.append('sessionId', sessionId);
      formData.append('shopDomain', shopDomain); // Include shopDomain for session creation
      if (customerId) {
        formData.append('customerId', customerId);
      }

      const response = await fetch(`${apiUrl}/api/upload-photo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();
      
      // Update preview with S3 URL
      setPortraitPhotoS3Url(data.url);
      setPortraitPhotoPreview(data.url); // Use S3 URL for preview
      
      console.log('Portrait photo uploaded to S3:', data.url);
    } catch (error: any) {
      console.error('Failed to upload portrait photo:', error);
      alert(`Failed to upload photo: ${error.message || 'Unknown error'}`);
      // Keep local preview on error
    } finally {
      setPortraitPhotoUploading(false);
    }
  };

  const handleSavePhotos = async () => {
    // Use standing photo if available, otherwise use portrait photo
    // For demo: fallback to demo photo if no photo uploaded
    const photoToUse = standingPhoto || portraitPhoto;
    const photoS3Url = standingPhotoS3Url || portraitPhotoS3Url || DEMO_PORTRAIT_PHOTO_URL;
    const photoPreview = standingPhotoPreview || portraitPhotoPreview || DEMO_PORTRAIT_PHOTO_URL;
    
    // Always set a photo (use demo photo if none uploaded)
    setUserPhoto(photoToUse || null); // Can be null for demo photo
    // Prefer S3 URL if available, otherwise use demo photo
    const finalPhotoUrl = photoS3Url || photoPreview || DEMO_PORTRAIT_PHOTO_URL;
    setUserPhotoPreview(finalPhotoUrl);
    
    // Update session with selected photo URL in database
    if (photoS3Url || DEMO_PORTRAIT_PHOTO_URL) {
      try {
        // Update the session to mark which photo is selected (userPhotoUrl)
        const photoUrlToSave = photoS3Url || DEMO_PORTRAIT_PHOTO_URL;
        const response = await fetch(`${apiUrl}/api/update-user-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userPhotoUrl: photoUrlToSave,
            customerId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Update failed' }));
          throw new Error(errorData.error || 'Failed to update selected photo');
        }

        console.log('Selected photo URL updated in database:', photoUrlToSave);
      } catch (error: any) {
        console.error('Failed to update selected photo URL', error);
        // Non-critical - continue anyway, photo is already uploaded or using demo
      }
    }
    
      setIsTryOnOpen(false);
  };

  const handleTryOn = async () => {
    if (!currentProduct) {
      alert('No product selected. Please select a product first.');
      return;
    }
    
    if (!currentProduct.image) {
      alert('Product image not available. Please try another product.');
      return;
    }

    setIsGeneratingTryOn(true);
    setGeneratedImage(null);

    try {
      // Determine product category to select appropriate photo type
      const productCategory = currentProduct.category || currentProduct.type || 'Fashion Accessory';
      const categoryType = mapCategoryToType(productCategory);
      const categoryConfig = getCategoryConfig(categoryType, productCategory);
      const requiresFullBody = categoryConfig.requiresFullBody;
      
      console.log('Try-on photo selection:', {
        productCategory,
        categoryType,
        requiresFullBody,
        hasStandingPhoto: !!standingPhoto,
        hasPortraitPhoto: !!portraitPhoto,
        hasUserPhoto: !!userPhoto,
        standingPhotoS3Url,
        portraitPhotoS3Url,
      });

      // Priority: 1. User uploaded File objects, 2. S3 URLs from uploads, 3. Demo photos
      let photoToUse: File | null = null;
      let photoUrlToUse: string | null = null;
      let photoSource = 'unknown';

      // First priority: Check for uploaded File objects (most recent uploads)
      if (requiresFullBody && standingPhoto) {
        // Product needs full body - use standing photo if available
        photoToUse = standingPhoto;
        photoSource = 'uploaded-standing-file';
        console.log('Using uploaded standing photo (File object)');
      } else if (!requiresFullBody && portraitPhoto) {
        // Product doesn't need full body - use portrait photo if available
        photoToUse = portraitPhoto;
        photoSource = 'uploaded-portrait-file';
        console.log('Using uploaded portrait photo (File object)');
      } else if (standingPhoto) {
        // Fallback: use standing photo if available
        photoToUse = standingPhoto;
        photoSource = 'uploaded-standing-file-fallback';
        console.log('Using uploaded standing photo (File object) as fallback');
      } else if (portraitPhoto) {
        // Fallback: use portrait photo if available
        photoToUse = portraitPhoto;
        photoSource = 'uploaded-portrait-file-fallback';
        console.log('Using uploaded portrait photo (File object) as fallback');
      } else if (userPhoto) {
        // Use userPhoto if set (from Save Photos)
        photoToUse = userPhoto;
        photoSource = 'saved-user-photo';
        console.log('Using saved user photo (File object)');
      } else {
        // No uploaded photos - use demo photos based on category
        if (requiresFullBody) {
          photoUrlToUse = DEMO_STANDING_PHOTO_URL;
          photoSource = 'demo-standing';
        } else {
          photoUrlToUse = DEMO_PORTRAIT_PHOTO_URL;
          photoSource = 'demo-portrait';
        }
        console.log('Using demo photo:', {
          photoType: requiresFullBody ? 'standing' : 'portrait',
          photoUrl: photoUrlToUse,
        });
      }

      // Get product image URL - ensure it's from local Product_images folder
      let productImageUrl = currentProduct.image || currentProduct.images?.[0] || '';
      
      // If it's a relative path (starts with /Product_images/), make it absolute
      // Works in both development and production (Vercel)
      if (productImageUrl.startsWith('/Product_images/') || productImageUrl.startsWith('/')) {
        // Use helper function that works in both dev and production
        productImageUrl = getAbsoluteImageUrl(productImageUrl);
      }
      
      // Use proxy only for external URLs (S3, etc.), not for local images
      const proxiedProductImageUrl = productImageUrl && 
        (productImageUrl.includes('s3.amazonaws.com') || productImageUrl.includes('vvapp.s3'))
        ? (getProxiedImageUrl(productImageUrl) || productImageUrl)
        : productImageUrl;
      
      console.log('Fetching product image for try-on:', {
        original: currentProduct.image,
        resolved: productImageUrl,
        proxied: proxiedProductImageUrl,
        productId: currentProduct.id,
        productName: currentProduct.title || currentProduct.name,
      });
      
      const productImageResponse = await fetch(proxiedProductImageUrl);
      if (!productImageResponse.ok) {
        throw new Error(`Failed to fetch product image: ${productImageResponse.statusText} (${productImageResponse.status})`);
      }
      const productImageBlob = await productImageResponse.blob();
      
      // Determine MIME type from response or default to jpeg
      const productContentType = productImageResponse.headers.get('content-type') || 'image/jpeg';
      const productFileExtension = productContentType.includes('png') ? 'png' : 
                                   productContentType.includes('webp') ? 'webp' : 'jpg';
      
      const productImageFile = new File([productImageBlob], `product.${productFileExtension}`, {
        type: productContentType,
        lastModified: Date.now(),
      });
      
      console.log('Product image file created:', {
        name: productImageFile.name,
        size: productImageFile.size,
        type: productImageFile.type,
        contentType: productContentType,
      });

      // Create form data
      const formData = new FormData();
      
      // Prepare user photo - use File object if available, otherwise fetch from URL
      if (photoToUse) {
        // Use uploaded File object directly (most recent upload)
        formData.append('userPhoto', photoToUse);
        console.log('Added user photo to form data (File object):', {
          name: photoToUse.name,
          size: photoToUse.size,
          type: photoToUse.type,
          source: photoSource,
        });
      } else if (photoUrlToUse) {
        // Fetch demo photo from URL and convert to File
        // Use helper function that works in both dev and production (Vercel)
        const absolutePhotoUrl = photoUrlToUse.startsWith('http') 
          ? photoUrlToUse 
          : getAbsoluteImageUrl(photoUrlToUse);
        
        console.log('Fetching demo photo from URL:', {
          original: photoUrlToUse,
          absolute: absolutePhotoUrl,
          source: photoSource,
        });
        
        const demoPhotoResponse = await fetch(absolutePhotoUrl);
        if (!demoPhotoResponse.ok) {
          const errorText = await demoPhotoResponse.text().catch(() => 'Unknown error');
          console.error('Demo photo fetch failed:', {
            status: demoPhotoResponse.status,
            statusText: demoPhotoResponse.statusText,
            error: errorText,
            photoUrl: absolutePhotoUrl,
          });
          throw new Error(`Failed to fetch demo photo: ${demoPhotoResponse.statusText}`);
        }
        const demoPhotoBlob = await demoPhotoResponse.blob();
        
        // Determine MIME type from response or default to jpeg
        const contentType = demoPhotoResponse.headers.get('content-type') || 'image/jpeg';
        const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
        
        const demoPhotoFile = new File([demoPhotoBlob], `demo-${requiresFullBody ? 'standing' : 'portrait'}.${fileExtension}`, {
          type: contentType,
          lastModified: Date.now(),
        });
        
        // Validate the file before adding to form data
        if (demoPhotoFile.size === 0) {
          throw new Error('Demo photo file is empty');
        }
        // Note: Demo photos are pre-compressed, so size check not needed
        
        formData.append('userPhoto', demoPhotoFile);
        console.log('Added demo photo to form data (fetched from URL):', {
          name: demoPhotoFile.name,
          size: demoPhotoFile.size,
          type: demoPhotoFile.type,
          contentType,
          source: photoSource,
          url: absolutePhotoUrl,
        });
      } else {
        throw new Error('No photo available for try-on');
      }
      // Use new format with productImageCount for multiple images support
      formData.append('productImage0', productImageFile);
      formData.append('productImageCount', '1');
      formData.append('productName', currentProduct.title || currentProduct.name || 'Product');
      formData.append('productCategory', currentProduct.category || currentProduct.type || 'Fashion Accessory');
      formData.append('productUrl', currentProduct.url || window.location.href);
      formData.append('sessionId', sessionId);
      formData.append('shopDomain', shopDomain);
      formData.append('productId', currentProduct.id || currentProduct.productId || '');
      if (customerId) {
        formData.append('customerId', customerId);
      }

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
      
      // Add the generated image as a message in the chat
      const tryOnMessage: Message = {
        role: 'assistant',
        content: `Here's how the ${currentProduct.title || currentProduct.name || 'product'} looks on you! 🎨`,
        timestamp: Date.now(),
        imageUrl: data.imageUrl,
      };
      setMessages(prev => [...prev, tryOnMessage]);
      
      // Show success message
      console.log('Try-on image generated successfully:', data.imageUrl);
      
      // Scroll to bottom to show the new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      // Don't open the dialog - user can see the image in chat
    } catch (error: any) {
      console.error('Try-on error:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error while generating your try-on image: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Also show alert for immediate feedback
      alert(error.message || 'Failed to generate try-on image');
      
      // Scroll to show error message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } finally {
      setIsGeneratingTryOn(false);
    }
  };

  return (
    <>
      {/* Container for both icon and chatbot window - fixed to bottom-right */}
      <div 
        className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 chat-widget-container"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          visibility: 'visible',
          opacity: 1,
          pointerEvents: 'auto', // Allow interactions with container and children
        }}
      >
        {/* Chatbot Window - slides in from right to left */}
        <AnimatePresence>
          {isOpen && !isMinimized && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[90vw] max-w-[400px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{
                zIndex: 10000,
                pointerEvents: 'auto', // Chat window can be interacted with
              }}
              onClick={(e) => e.stopPropagation()}
            >
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center mb-2">
            <div className="flex items-center gap-3">
              {/* Gradient Avatar */}
              <div 
                className="w-10 h-10 rounded-full flex-shrink-0 relative"
                style={{
                  background: 'linear-gradient(135deg, #60a5fa, #f472b6, #a78bfa)',
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 4s ease infinite',
                  boxShadow: '0 0 20px rgba(96, 165, 250, 0.4), 0 0 40px rgba(244, 114, 182, 0.3), 0 0 60px rgba(167, 139, 250, 0.2)',
                }}
              ></div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Hi, I&apos;m your shopping assistant</h3>
                {currentProduct && (
                <p className="text-sm text-gray-600">
                    Currently viewing {currentProduct.title ? (
                    <span className="font-semibold text-gray-900">{currentProduct.title}</span>
                  ) : (
                    'a product'
                  )}
                </p>
                )}
              </div>
            </div>
          </div>

          {/* Try-On Section */}
          {currentProduct && (
            <div className="flex gap-2">
              {/* Try On This Product Button - Starts generation directly */}
              <Button
                onClick={handleTryOn}
                disabled={isGeneratingTryOn}
                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white rounded-lg h-10 text-sm font-medium disabled:opacity-50"
              >
                {isGeneratingTryOn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                <Sparkles className="h-4 w-4 mr-2" />
                Try on this product
                  </>
                )}
              </Button>
              {/* Upload Button - Opens upload dialog */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsTryOnOpen(true)}
                className="h-10 w-10 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Upload custom photo"
              >
                <ArrowUp className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white overflow-x-visible">
          <AnimatePresence>
            {/* Initial Chat Bubble - Always visible */}
              <motion.div
                key="initial-greeting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              className="flex justify-start items-start gap-2"
              >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-gray-900">How may I help you?</p>
                  </div>
            </motion.div>

            {messages.map((message, index) => (
              <motion.div
                key={`message-${message.timestamp}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-start gap-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {/* Bot icon for assistant messages (on the left) */}
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-gray-600" />
                </div>
                )}
                
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content
                      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold (**text** -> text)
                      .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic (*text* -> text)
                      .replace(/`(.*?)`/g, '$1') // Remove markdown code (`text` -> text)
                      .replace(/#{1,6}\s/g, '') // Remove markdown headers
                      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links (keep text)
                    }
                  </p>
                  
                  {/* Display try-on generated image */}
                  {message.imageUrl && (
                    <div className="mt-3 space-y-2">
                      <div 
                        className="rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => {
                          // Open image in new window/tab for full view (use proxied URL to avoid CORS)
                          if (!message.imageUrl) return;
                          const viewUrl = getProxiedImageUrl(message.imageUrl) || message.imageUrl;
                          window.open(viewUrl, '_blank');
                        }}
                        title="Click to view full size"
                      >
                        <img
                          src={getProxiedImageUrl(message.imageUrl)}
                          alt="Try-on result"
                          className="w-full h-auto object-contain max-h-96"
                          onError={(e) => {
                            console.error('Failed to load try-on image:', message.imageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      {/* Download button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Create a temporary link to download the image
                          // Use proxied URL for download to avoid CORS issues
                          if (!message.imageUrl) return;
                          const downloadUrl = getProxiedImageUrl(message.imageUrl) || message.imageUrl;
                          if (!downloadUrl) return;
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.download = `try-on-${Date.now()}.jpg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                      >
                        <ImageIcon className="h-3 w-3 mr-2" />
                        Download Image
                      </Button>
                    </div>
                  )}
                  
                  {/* Only show products if user explicitly asked for recommendations */}
                  {message.products && message.products.length > 0 && message.role === 'assistant' && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Recommended Products:</p>
                      {message.products.slice(0, 5).map((product: any, i: number) => (
                        <Link
                          key={`product-${product.id || product.title || i}-${message.timestamp}`}
                          href={`/store/products/${product.id}`}
                          className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-3 group"
                        >
                          {/* Product Thumbnail - Larger and more prominent */}
                          <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                            <img
                              src={product.image || product.imageUrl || product.thumbnail || '/placeholder.svg?height=64&width=64'}
                              alt={product.title || 'Product'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                // Fallback to placeholder if image fails
                                e.currentTarget.src = '/placeholder.svg?height=64&width=64';
                              }}
                            />
                          </div>
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {product.title || product.name}
                            </p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">
                              ${typeof product.price === 'number' ? (product.price / 100).toFixed(2) : product.price}
                            </p>
                            {product.category && (
                              <p className="text-xs text-gray-500 capitalize mt-0.5">
                                {product.category}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* User icon for user messages (on the right) */}
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                key="loading-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Template Buttons - Show above input when no messages */}
        {messages.length === 0 && (
          <div className="p-4 bg-white">
            <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const message = "Tell me more about this product";
                      const userMessage: Message = {
                        role: 'user',
                        content: message,
                        timestamp: Date.now(),
                      };
                      setMessages(prev => [...prev, userMessage]);
                      setIsLoading(true);
                      try {
                        const response = await fetch(`${apiUrl}/api/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sessionId,
                            message,
                            context: { currentProduct, shopDomain, customerId },
                          }),
                        });
                        if (!response.ok) throw new Error('Failed to send message');
                        const data = await response.json();
                    // Only include products if API returned them (should only happen for recommendations)
                        const assistantMessage: Message = {
                          role: 'assistant',
                          content: data.message,
                          timestamp: Date.now(),
                      products: data.products && data.products.length > 0 ? data.products : undefined,
                        };
                        setMessages(prev => [...prev, assistantMessage]);
                      } catch (error) {
                        console.error('Chat error:', error);
                        const errorMessage: Message = {
                          role: 'assistant',
                          content: 'Sorry, I encountered an error. Please try again.',
                          timestamp: Date.now(),
                        };
                        setMessages(prev => [...prev, errorMessage]);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                className="w-full justify-start bg-gray-100 hover:bg-gray-200 border-0 rounded-lg h-auto py-1.5 px-3 text-xs text-gray-900 font-normal"
                  >
                    Tell me more about this product
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const message = "Recommend matching items";
                      const userMessage: Message = {
                        role: 'user',
                        content: message,
                        timestamp: Date.now(),
                      };
                      setMessages(prev => [...prev, userMessage]);
                      setIsLoading(true);
                      try {
                        const response = await fetch(`${apiUrl}/api/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sessionId,
                            message,
                            context: { currentProduct, shopDomain, customerId },
                          }),
                        });
                        if (!response.ok) throw new Error('Failed to send message');
                        const data = await response.json();
                    // Only include products if API returned them (should only happen for recommendations)
                        const assistantMessage: Message = {
                          role: 'assistant',
                          content: data.message,
                          timestamp: Date.now(),
                      products: data.products && data.products.length > 0 ? data.products : undefined,
                        };
                        setMessages(prev => [...prev, assistantMessage]);
                      } catch (error) {
                        console.error('Chat error:', error);
                        const errorMessage: Message = {
                          role: 'assistant',
                          content: 'Sorry, I encountered an error. Please try again.',
                          timestamp: Date.now(),
                        };
                        setMessages(prev => [...prev, errorMessage]);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                className="w-full justify-start bg-gray-100 hover:bg-gray-200 border-0 rounded-lg h-auto py-1.5 px-3 text-xs text-gray-900 font-normal"
                  >
                    Recommend matching items
                  </Button>
                </div>
          </div>
            )}

        {/* Ticket Creation Form */}
        {showTicketForm && !createdTicketId && (
          <div className="p-4 border-t border-gray-200 bg-white relative">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4 relative overflow-visible">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Create Support Ticket</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowTicketForm(false);
                    setTicketCategory('');
                    setTicketMessage('');
                  }}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
                        </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Issue Category
                  </label>
                  <Select value={ticketCategory} onValueChange={setTicketCategory}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Returns">Returns</SelectItem>
                      <SelectItem value="Product Understanding">Product Understanding</SelectItem>
                      <SelectItem value="Shipping">Shipping</SelectItem>
                      <SelectItem value="Payment">Payment</SelectItem>
                      <SelectItem value="Account">Account</SelectItem>
                      <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                      <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                    </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Describe your issue
                  </label>
                  <Textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Please describe the issue you're experiencing..."
                    className="min-h-[100px] bg-white resize-none"
                  />
                </div>
                
                <Button
                  onClick={handleTicketSubmit}
                  disabled={!ticketCategory || !ticketMessage.trim()}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                >
                  Create Ticket
                </Button>
                </div>
        </div>
          </div>
        )}

        {/* Input */}
        {!showTicketForm && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-gray-50 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chatbot Icon Button - Always visible */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Chat widget button clicked!', { isOpen });
            setIsOpen((prev) => !prev);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="h-14 w-14 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform flex items-center justify-center flex-shrink-0"
          style={{ 
            width: '56px',
            height: '56px',
            minWidth: '56px',
            minHeight: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #60a5fa 0%, #f472b6 50%, #a78bfa 100%)',
            boxShadow: '0 10px 30px rgba(96, 165, 250, 0.4), 0 0 0 4px rgba(96, 165, 250, 0.1)',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001, // Higher than chat window
            position: 'relative',
            visibility: 'visible',
            opacity: 1,
            pointerEvents: 'auto', // Button can be clicked
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
          aria-label="Open chat widget"
          id="chat-widget-toggle-button"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Try-On Dialog */}
      <Dialog open={isTryOnOpen} onOpenChange={setIsTryOnOpen}>
        <DialogContent className="max-w-3xl p-0 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Try-On Photo Upload</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Let&apos;s Find Your Perfect Fit</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsTryOnOpen(false)}
                className="h-8 w-8 text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Always show upload form - images are displayed in chat only */}
            {/* Intro Text */}
            <p className="text-gray-700 mb-6">
              Upload a photo to see products styled on you. We&apos;ll show you exactly how each item looks before you buy.
            </p>

            {/* Two Column Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Standing Photo */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Standing Photo</h3>
                <div
                  onClick={() => standingPhotoInputRef.current?.click()}
                  className="border-2 border-gray-300 border-dashed rounded-lg p-8 cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
                >
                  {standingPhotoUploading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                      <p className="text-gray-700 font-medium">Uploading to S3...</p>
                    </div>
                  ) : standingPhotoPreview ? (
                    <div className="relative">
                      <img
                        src={getProxiedImageUrl(standingPhotoPreview) || standingPhotoPreview}
                        alt="Standing photo preview"
                        className="w-full max-h-96 object-contain rounded-lg border-2 border-green-500 shadow-lg bg-gray-100"
                        onError={(e) => {
                          console.error('Failed to load standing photo:', standingPhotoPreview);
                          console.error('Image error details:', e);
                        }}
                        onLoad={() => {
                          console.log('Standing photo loaded successfully:', standingPhotoPreview);
                        }}
                      />
                      {standingPhotoS3Url && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Uploaded
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStandingPhoto(null);
                          setStandingPhotoPreview(null);
                          setStandingPhotoS3Url(null);
                          if (standingPhotoInputRef.current) {
                            standingPhotoInputRef.current.value = '';
                          }
                        }}
                        className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70"
                      >
                        <X className="h-3 w-3 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Mountain className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-700 font-medium mb-1">Click to upload</p>
                      <p className="text-gray-500 text-sm">or drag and drop</p>
                    </div>
                  )}
                </div>
                <input
                  ref={standingPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStandingPhotoUpload}
                  className="hidden"
                />
                <p className="text-sm text-gray-600 mt-3">
                  Full-length photo for dresses, pants & full outfits. Stand naturally with good lighting.
                </p>
              </div>

              {/* Portrait Photo */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Portrait Photo</h3>
                <div
                  onClick={() => portraitPhotoInputRef.current?.click()}
                  className="border-2 border-gray-300 border-dashed rounded-lg p-8 cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
                >
                  {portraitPhotoUploading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                      <p className="text-gray-700 font-medium">Uploading to S3...</p>
                    </div>
                  ) : portraitPhotoPreview ? (
                    <div className="relative">
                      <img
                        src={getProxiedImageUrl(portraitPhotoPreview) || portraitPhotoPreview}
                        alt="Portrait photo preview"
                        className="w-full max-h-96 object-contain rounded-lg border-2 border-green-500 shadow-lg bg-gray-100"
                        onError={(e) => {
                          console.error('Failed to load portrait photo:', portraitPhotoPreview);
                          console.error('Image error details:', e);
                        }}
                        onLoad={() => {
                          console.log('Portrait photo loaded successfully:', portraitPhotoPreview);
                        }}
                      />
                      {portraitPhotoS3Url && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Uploaded
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPortraitPhoto(null);
                          setPortraitPhotoPreview(null);
                          setPortraitPhotoS3Url(null);
                          if (portraitPhotoInputRef.current) {
                            portraitPhotoInputRef.current.value = '';
                          }
                        }}
                        className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70"
                      >
                        <X className="h-3 w-3 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Mountain className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-700 font-medium mb-1">Click to upload</p>
                      <p className="text-gray-500 text-sm">or drag and drop</p>
                    </div>
                  )}
                </div>
                <input
                  ref={portraitPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePortraitPhotoUpload}
                  className="hidden"
                />
                <p className="text-sm text-gray-600 mt-3">
                  Waist-up photo for tops, accessories & jewelry. Face clearly visible works best.
                </p>
              </div>
            </div>

            {/* Privacy Statement */}
            <div className="bg-gray-100 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Your privacy matters. Photos are encrypted, never shared, and only visible to you. We never use your images for AI training or any other purpose.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsTryOnOpen(false)}
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePhotos}
                disabled={!standingPhoto && !portraitPhoto}
                className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

