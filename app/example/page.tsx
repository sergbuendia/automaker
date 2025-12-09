"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { FileInput } from "@/components/ui/file-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { replaceVariables } from "@/lib/prompt-template";
import {
  Loader2,
  Sparkles,
  Wand2,
  LayoutGrid,
  Layers,
  History,
  Settings,
  Bell,
  HelpCircle,
  Clock,
  List,
  Maximize2,
  Copy,
  Download,
  SlidersHorizontal,
  RotateCcw,
  X,
  Wand,
  Dices,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  ImagePlus,
  Save,
  Heart,
  FolderOpen,
  FileText,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import Image from "next/image";
import { ParameterTooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageLightbox } from "@/components/ImageLightbox";
import { MediaRenderer } from "@/components/MediaRenderer";
import { useSession } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { usePresets, useCreatePreset } from "@/hooks/use-presets";
import { usePrompts, useCreatePrompt } from "@/hooks/use-prompts";
import { useImages, useImage, useToggleFavorite, useCreateVariation } from "@/hooks/use-images";
import { useSubmitJob, useJobStatus } from "@/hooks/use-jobs";
import { useUpload } from "@/hooks/use-upload";
import { useQueryClient } from "@tanstack/react-query";

// Parameter tooltips content
const PARAMETER_TOOLTIPS = {
  aspectRatio:
    "The width-to-height ratio of the generated image. Square (1:1) works well for icons, while widescreen (16:9) is great for landscapes.",
  imageCount:
    "The number of images to generate in one batch. More images give you more options to choose from.",
  guidance:
    "Controls how closely the AI follows your prompt. Higher values (10-20) follow the prompt more strictly, while lower values (1-5) give more creative freedom.",
  steps:
    "The number of refinement iterations. More steps (50-150) produce higher quality but take longer. 20-30 steps is usually sufficient.",
  seed: "A number that determines the random starting point. Using the same seed with the same prompt produces identical results, useful for variations.",
  model:
    "The AI model to use for generation. Different models have different strengths, speeds, and styles.",
  negativePrompt:
    "Things you don't want to appear in the image. For example: 'blurry, low quality, distorted'.",
  styleModifiers:
    "Quick-add keywords that enhance your prompt with common quality and style improvements.",
  cameraModifiers:
    "Add camera types, lenses, focal lengths, and apertures to achieve specific photographic looks and effects.",
  depthAngleModifiers:
    "Control camera angles, shot distances, and perspectives to create compelling compositions and viewpoints.",
};

interface GeneratedImage {
  id: string;
  fileUrl: string;
  width: number;
  height: number;
  prompt: string;
  modelId: string;
  format?: string | null;
  isFavorite?: boolean;
  rating?: number | null;
  parameters?: any;
  createdAt?: string;
  negativePrompt?: string;
}

interface GenerationJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  prompt: string;
  modelId: string;
  parameters: any;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  images?: GeneratedImage[];
}

const MODELS = [
  {
    id: "flux-pro",
    name: "Flux Pro",
    description: "Highest quality",
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsImageToVideo: false,
  },
  {
    id: "flux-dev",
    name: "Flux Dev",
    description: "Balanced speed/quality",
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsImageToVideo: false,
  },
  {
    id: "flux-schnell",
    name: "Flux Schnell",
    description: "Fast generation",
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsImageToVideo: false,
  },
  {
    id: "sdxl",
    name: "Stable Diffusion XL",
    description: "Versatile",
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsImageToVideo: false,
  },
  {
    id: "wan-25",
    name: "WAN 2.5",
    description: "Image to Video",
    supportsTextToImage: false,
    supportsImageToImage: false,
    supportsImageToVideo: true,
  },
];

// Helper function to get available models for a generation mode
const getAvailableModels = (mode: "text-to-image" | "image-to-image" | "image-to-video") => {
  return MODELS.filter((model) => {
    switch (mode) {
      case "text-to-image":
        return model.supportsTextToImage;
      case "image-to-image":
        return model.supportsImageToImage;
      case "image-to-video":
        return model.supportsImageToVideo;
      default:
        return false;
    }
  });
};

const ASPECT_RATIOS = [
  { id: "square", label: "1:1", w: 5, h: 5 },
  { id: "portrait_4_3", label: "3:4", w: 3, h: 4 },
  { id: "landscape_4_3", label: "4:3", w: 4, h: 3 },
  { id: "landscape_16_9", label: "16:9", w: 7, h: 4 },
];

const STYLE_MODIFIERS = [
  "4K",
  "8K",
  "Detailed",
  "Cinematic",
  "Octane Render",
  "Ray Tracing",
  "Ultra realistic",
  "High quality",
  "Award winning",
  "Professional",
];

const CAMERA_MODIFIERS = [
  "DSLR",
  "Mirrorless camera",
  "Medium format",
  "Large format",
  "Film camera",
  "14mm lens",
  "24mm lens",
  "35mm lens",
  "50mm lens",
  "85mm lens",
  "135mm lens",
  "200mm lens",
  "Wide angle lens",
  "Telephoto lens",
  "Macro lens",
  "Fisheye lens",
  "Prime lens",
  "Zoom lens",
  "f/1.2",
  "f/1.4",
  "f/1.8",
  "f/2.8",
  "f/4",
  "f/5.6",
  "Shallow depth of field",
  "Deep depth of field",
  "Bokeh",
  "Tilt-shift",
  "Anamorphic",
];

const DEPTH_ANGLE_MODIFIERS = [
  "Extreme close-up",
  "Close-up shot",
  "Medium close-up",
  "Medium shot",
  "Medium long shot",
  "Long shot",
  "Extreme long shot",
  "Full body shot",
  "Cowboy shot",
  "Eye level angle",
  "High angle",
  "Low angle",
  "Bird's eye view",
  "Worm's eye view",
  "Dutch angle",
  "Overhead shot",
  "Aerial view",
  "Ground level",
  "Over-the-shoulder",
  "Point of view shot",
  "First-person view",
  "Third-person view",
  "Side profile",
  "Three-quarter view",
  "Front view",
  "Back view",
  "Isometric view",
  "Forced perspective",
  "Macro photography",
  "Micro lens shot",
  "Tracking shot",
  "Establishing shot",
  "Two-shot",
];

function GeneratePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // TanStack Query hooks
  const { data: session, isPending: sessionLoading } = useSession();
  const { data: settingsData } = useSettings();
  const { data: presetsData } = usePresets(!!session);
  const { data: promptsData } = usePrompts(!!session);
  const { data: historyData } = useImages({ limit: 20 });
  const createPresetMutation = useCreatePreset();
  const createPromptMutation = useCreatePrompt();
  const toggleFavoriteMutation = useToggleFavorite();
  const createVariationMutation = useCreateVariation();
  const submitJobMutation = useSubmitJob();
  const uploadMutation = useUpload();

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [model, setModel] = useState("flux-pro");
  const [aspectRatio, setAspectRatio] = useState("landscape_16_9");
  const [numImages, setNumImages] = useState(1);
  const [steps, setSteps] = useState(28);
  const [guidance, setGuidance] = useState(3.5);
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  // Job-based generation state
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const processedJobsRef = useRef<Set<string>>(new Set());
  const autoStartTriggeredRef = useRef(false);

  // Job status polling
  const pendingJobIds = jobs
    .filter((j) => j.status === "pending" || j.status === "processing")
    .map((j) => j.id);
  const { data: jobStatusData } = useJobStatus(pendingJobIds, {
    enabled: pendingJobIds.length > 0,
  });

  // UI States
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Image-to-image mode
  const [generationMode, setGenerationMode] = useState<
    "text-to-image" | "image-to-image" | "image-to-video"
  >("text-to-image");
  const [sourceImage, setSourceImage] = useState<string | null>(null); // URL or data URL
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [strength, setStrength] = useState(0.75); // 0-1, how much to transform
  const [isDragging, setIsDragging] = useState(false);

  // Video generation state (for WAN 2.5)
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">("1080p");
  const [duration, setDuration] = useState<5 | 10>(5);

  // Preset state
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [savePresetData, setSavePresetData] = useState({
    name: "",
    description: "",
  });

  // Save Prompt state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savePromptData, setSavePromptData] = useState({
    title: "",
    category: "",
  });

  // Template/Prompt loading state
  const [showLoadPromptModal, setShowLoadPromptModal] = useState(false);
  const [showTemplateVariablesModal, setShowTemplateVariablesModal] =
    useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVariableValues, setTemplateVariableValues] = useState<
    Record<string, string>
  >({});

  // Style modifiers state
  const [activeStyles, setActiveStyles] = useState<string[]>([]);

  // Camera modifiers state
  const [activeCameras, setActiveCameras] = useState<string[]>([]);

  // Depth/Angle modifiers state
  const [activeDepthAngles, setActiveDepthAngles] = useState<string[]>([]);

  // View mode state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Derived state from queries
  const presets = presetsData?.presets || [];
  const savedPrompts = promptsData?.prompts || [];
  const historyImages = historyData?.images || [];

  const handleAddStyleModifier = (style: string) => {
    // Add the style to active styles if not already there
    if (!activeStyles.includes(style)) {
      setActiveStyles([...activeStyles, style]);
      // Add the style to the prompt if it's not already there
      const styleText = style.toLowerCase();
      if (!prompt.toLowerCase().includes(styleText)) {
        setPrompt((prev) => (prev ? `${prev}, ${style}` : style));
      }
    }
  };

  const handleRemoveStyleModifier = (style: string) => {
    setActiveStyles(activeStyles.filter((s) => s !== style));
    // Remove the style from the prompt
    const styleRegex = new RegExp(
      `(,?\\s*${style}\\s*,?|${style}\\s*,|,\\s*${style})`,
      "gi"
    );
    const updatedPrompt = prompt
      .replace(styleRegex, ",")
      .replace(/,\s*,/g, ",")
      .replace(/^\s*,\s*/, "")
      .replace(/\s*,\s*$/, "")
      .trim();
    setPrompt(updatedPrompt);
  };

  const handleAddCameraModifier = (camera: string) => {
    if (!activeCameras.includes(camera)) {
      setActiveCameras([...activeCameras, camera]);
      const cameraText = camera.toLowerCase();
      if (!prompt.toLowerCase().includes(cameraText)) {
        setPrompt((prev) => (prev ? `${prev}, ${camera}` : camera));
      }
    }
  };

  const handleRemoveCameraModifier = (camera: string) => {
    setActiveCameras(activeCameras.filter((c) => c !== camera));
    const cameraRegex = new RegExp(
      `(,?\\s*${camera}\\s*,?|${camera}\\s*,|,\\s*${camera})`,
      "gi"
    );
    const updatedPrompt = prompt
      .replace(cameraRegex, ",")
      .replace(/,\s*,/g, ",")
      .replace(/^\s*,\s*/, "")
      .replace(/\s*,\s*$/, "")
      .trim();
    setPrompt(updatedPrompt);
  };

  const handleAddDepthAngleModifier = (modifier: string) => {
    if (!activeDepthAngles.includes(modifier)) {
      setActiveDepthAngles([...activeDepthAngles, modifier]);
      const modifierText = modifier.toLowerCase();
      if (!prompt.toLowerCase().includes(modifierText)) {
        setPrompt((prev) => (prev ? `${prev}, ${modifier}` : modifier));
      }
    }
  };

  const handleRemoveDepthAngleModifier = (modifier: string) => {
    setActiveDepthAngles(activeDepthAngles.filter((m) => m !== modifier));
    const modifierRegex = new RegExp(
      `(,?\\s*${modifier}\\s*,?|${modifier}\\s*,|,\\s*${modifier})`,
      "gi"
    );
    const updatedPrompt = prompt
      .replace(modifierRegex, ",")
      .replace(/,\s*,/g, ",")
      .replace(/^\s*,\s*/, "")
      .replace(/\s*,\s*$/, "")
      .trim();
    setPrompt(updatedPrompt);
  };

  const handleSourceImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview the image
    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceImage(event.target?.result as string);
      setSourceImageFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDragStart = (e: React.DragEvent, imageUrl: string) => {
    e.dataTransfer.setData("image/url", imageUrl);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Check if dragging from gallery first
    const imageUrl = e.dataTransfer.getData("image/url");
    if (imageUrl) {
      setSourceImage(imageUrl);
      setSourceImageFile(null); // Clear file if using existing image
      return;
    }

    // Otherwise handle file drop
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Check if it's an image
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setSourceImage(event.target?.result as string);
          setSourceImageFile(file);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error("Invalid file type", {
          description: "Please upload an image file",
        });
      }
    }
  };

  const handleSelectExistingImage = (imageUrl: string) => {
    setSourceImage(imageUrl);
    setSourceImageFile(null); // Clear file if using existing image
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded!", {
        description: "Image saved to your downloads folder",
      });
    } catch (error) {
      console.error("Failed to download image:", error);
      setError("Failed to download image. Please try again.");
      toast.error("Download failed", {
        description: "Failed to download image. Please try again.",
      });
    }
  };

  const handleToggleFavorite = async (imageId: string) => {
    toggleFavoriteMutation.mutate(imageId, {
      onSuccess: () => {
        setGeneratedImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, isFavorite: true } : img
          )
        );
        toast.success("Added to favorites!");
      },
      onError: (error) => {
        console.error("Failed to toggle favorite:", error);
        toast.error("Failed to add to favorites");
      },
    });
  };

  const handleGenerateVariation = async (image: GeneratedImage) => {
    setError("");

    createVariationMutation.mutate(
      { imageId: image.id },
      {
        onSuccess: (data) => {
          setGeneratedImages((prev) => [data.image, ...prev]);
          setGenerationTime(data.generationTime || null);
          toast.success("Variation created!", {
            description: "New variation added to your gallery",
          });
        },
        onError: (err) => {
          console.error("Failed to generate variation:", err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to generate variation. Please try again.";
          setError(errorMessage);
          toast.error("Variation failed", {
            description: errorMessage,
          });
        },
      }
    );
  };

  // Load prompt from URL parameters and handle variation/remix/upscale
  useEffect(() => {
    const urlPrompt = searchParams.get("prompt");
    const urlNegativePrompt = searchParams.get("negativePrompt");
    const urlModel = searchParams.get("model");
    const variationFrom = searchParams.get("variationFrom");
    const remixFrom = searchParams.get("remixFrom");
    const upscaleFrom = searchParams.get("upscaleFrom");

    if (urlPrompt) setPrompt(urlPrompt);
    if (urlNegativePrompt) setNegativePrompt(urlNegativePrompt);
    if (urlModel) {
      // Validate that it's a valid model ID
      const validModels = MODELS.map((m) => m.id);
      if (validModels.includes(urlModel)) {
        setModel(urlModel);
      }
    }

    // Handle variation from existing image
    if (variationFrom) {
      loadImageForVariation(variationFrom);
    }

    // Handle remix from existing image
    if (remixFrom) {
      loadImageForRemix(remixFrom);
    }

    // Handle upscale from existing image
    if (upscaleFrom) {
      loadImageForUpscale(upscaleFrom);
    }
  }, [searchParams]);

  // Auto-start generation when variation is loaded
  useEffect(() => {
    const autoStart = searchParams.get("autoStart");

    if (autoStart === "true" && prompt && !autoStartTriggeredRef.current) {
      autoStartTriggeredRef.current = true;
      // Small delay to ensure all state is set
      setTimeout(() => {
        handleGenerate();
        // Clean up URL to remove query parameters after starting the job
        router.replace("/generate/canvas", { scroll: false });
      }, 100);
    }
  }, [prompt, searchParams, router]);

  const loadImageForVariation = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`);
      if (response.ok) {
        const data = await response.json();
        const image = data.image;

        // Populate form with parent image settings
        setPrompt(image.prompt || "");
        setNegativePrompt(image.negativePrompt || "");
        setModel(image.modelId || "flux-pro");
        if (image.parameters) {
          if (image.parameters.aspectRatio)
            setAspectRatio(image.parameters.aspectRatio);
          if (image.parameters.steps) setSteps(image.parameters.steps);
          if (image.parameters.guidance) setGuidance(image.parameters.guidance);
          // Generate a new seed for variation (slightly different from parent)
          if (image.parameters.seed) {
            const parentSeed = parseInt(image.parameters.seed) || 0;
            const newSeed = parentSeed + Math.floor(Math.random() * 1000) + 1;
            setSeed(newSeed.toString());
          }
        }
        toast.success("Variation settings loaded!", {
          description: "Seed has been adjusted. Click Generate to create variation.",
        });
      }
    } catch (error) {
      console.error("Failed to load image for variation:", error);
      setError("Failed to load parent image");
    }
  };

  const loadImageForRemix = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`);
      if (response.ok) {
        const data = await response.json();
        const image = data.image;

        // Populate form with parent image settings but clear prompt for remix
        setPrompt(""); // User will enter new prompt
        setNegativePrompt(image.negativePrompt || "");
        setModel(image.modelId || "flux-pro");
        if (image.parameters) {
          if (image.parameters.aspectRatio)
            setAspectRatio(image.parameters.aspectRatio);
          if (image.parameters.steps) setSteps(image.parameters.steps);
          if (image.parameters.guidance) setGuidance(image.parameters.guidance);
          if (image.parameters.seed) setSeed(image.parameters.seed);
        }

        // Set to image-to-image mode and use the original image as the source
        setGenerationMode("image-to-image");
        setSourceImage(image.fileUrl);
        setSourceImageFile(null);

        toast.success("Remix settings loaded!", {
          description: "Enter a new prompt and click Generate to remix with the original image.",
        });
      }
    } catch (error) {
      console.error("Failed to load image for remix:", error);
      setError("Failed to load parent image");
    }
  };

  const loadImageForUpscale = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`);
      if (response.ok) {
        const data = await response.json();
        toast.info("Upscaling feature coming soon!", {
          description: "For now, you can download and use external upscaling tools.",
        });
      }
    } catch (error) {
      console.error("Failed to load image for upscale:", error);
      setError("Failed to load parent image");
    }
  };

  // Process job status updates from the hook
  useEffect(() => {
    if (!jobStatusData?.jobs) {
      return;
    }

    const updatedJobs = jobStatusData.jobs;

    setJobs((prevJobs) =>
      prevJobs.map((job) => {
        const update = updatedJobs.find((u: any) => u.id === job.id);
        if (update) {
          // If job just completed, show toast notification
          if (
            job.status !== "completed" &&
            update.status === "completed" &&
            !processedJobsRef.current.has(job.id)
          ) {
            // Mark this job as processed
            processedJobsRef.current.add(job.id);

            toast.success(
              `Generation completed for "${update.prompt.substring(
                0,
                30
              )}..."`,
              {
                description: `Generated ${
                  update.images?.length || 0
                } image${update.images?.length !== 1 ? "s" : ""}`,
              }
            );

            // Add completed images to generatedImages
            if (update.images && update.images.length > 0) {
              setGeneratedImages((prev) => [...update.images, ...prev]);
            }

            // Refresh history and billing
            queryClient.invalidateQueries({ queryKey: ["images"] });
            queryClient.invalidateQueries({ queryKey: ["billing"] });
          } else if (
            job.status !== "failed" &&
            update.status === "failed" &&
            !processedJobsRef.current.has(job.id)
          ) {
            // Mark this job as processed
            processedJobsRef.current.add(job.id);

            toast.error(
              `Generation failed for "${update.prompt.substring(
                0,
                30
              )}..."`,
              {
                description:
                  update.errorMessage || "Unknown error occurred",
              }
            );
          }

          return {
            ...job,
            ...update,
          };
        }
        return job;
      })
    );
  }, [jobStatusData]);


  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();

    createPresetMutation.mutate(
      {
        name: savePresetData.name,
        description: savePresetData.description || null,
        modelId: model,
        parameters: {
          model,
          width: 0,
          height: 0,
          steps,
          guidanceScale: guidance,
          aspectRatio,
          numImages,
          seed: seed || null,
        },
      },
      {
        onSuccess: () => {
          setShowSavePresetModal(false);
          setSavePresetData({ name: "", description: "" });
          setError("");
          toast.success("Preset saved!", {
            description: `"${savePresetData.name}" is ready to use`,
          });
        },
        onError: (err) => {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to save preset";
          setError(errorMessage);
          toast.error("Failed to save preset", {
            description: errorMessage,
          });
        },
      }
    );
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setModel(preset.modelId);
      const params = preset.parameters || {};
      setAspectRatio(params.aspectRatio || "landscape_16_9");
      setNumImages(params.numImages || 1);
      setSteps(params.steps || 28);
      setGuidance(params.guidance || 3.5);
      setSeed(params.seed || "");
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();

    createPromptMutation.mutate(
      {
        text: prompt,
        name: savePromptData.title,
        category: savePromptData.category || undefined,
        tags: [],
      },
      {
        onSuccess: () => {
          setShowSaveModal(false);
          setSavePromptData({ title: "", category: "" });
          setError("");
          toast.success("Prompt saved!", {
            description: `"${savePromptData.title}" has been saved to your library`,
          });
        },
        onError: (err) => {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to save prompt";
          setError(errorMessage);
          toast.error("Failed to save prompt", {
            description: errorMessage,
          });
        },
      }
    );
  };

  const handleLoadPrompt = (promptItem: any) => {
    // Check if this is a template with variables
    if (promptItem.isTemplate && promptItem.templateVariables?.length > 0) {
      // Open modal to fill in variables
      setSelectedTemplate(promptItem);
      // Initialize empty values for all variables
      const initialValues: Record<string, string> = {};
      promptItem.templateVariables.forEach((varName: string) => {
        initialValues[varName] = "";
      });
      setTemplateVariableValues(initialValues);
      setShowLoadPromptModal(false);
      setShowTemplateVariablesModal(true);
    } else {
      // Regular prompt, just load it
      setPrompt(promptItem.promptText);
      setNegativePrompt(promptItem.negativePrompt || "");
      setShowLoadPromptModal(false);
    }
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;

    // Replace variables in the template
    const filledPrompt = replaceVariables(
      selectedTemplate.promptText,
      templateVariableValues
    );
    setPrompt(filledPrompt);

    if (selectedTemplate.negativePrompt) {
      const filledNegativePrompt = replaceVariables(
        selectedTemplate.negativePrompt,
        templateVariableValues
      );
      setNegativePrompt(filledNegativePrompt);
    }

    // Close modal and reset
    setShowTemplateVariablesModal(false);
    setSelectedTemplate(null);
    setTemplateVariableValues({});
  };

  const handleHistoryItemClick = (image: GeneratedImage) => {
    router.push(`/generate/images/${image.id}?returnTo=/generate/canvas`);
  };

  const handleGenerate = async () => {
    if (!session?.user) {
      setError("Please sign in to generate images");
      return;
    }
    if (!prompt) return;

    // Check for source image in img2img mode
    if (generationMode === "image-to-image" && !sourceImage) {
      setError("Please select or upload a source image");
      return;
    }

    // Check for source image in image-to-video mode
    if (generationMode === "image-to-video" && !sourceImage) {
      setError("Please select or upload a source image for video generation");
      return;
    }

    setError("");

    // Create optimistic job ID
    const optimisticJobId = `optimistic-${Date.now()}`;

    // Create optimistic job immediately for instant UI feedback
    const optimisticJob: GenerationJob = {
      id: optimisticJobId,
      status: "pending",
      prompt,
      modelId: model,
      parameters: {
        prompt,
        negativePrompt: negativePrompt || undefined,
        model,
        aspectRatio,
        numImages,
        steps: steps || undefined,
        guidance: guidance || undefined,
        seed: seed ? parseInt(seed) : undefined,
        generationMode,
      },
      createdAt: new Date(),
    };

    // Add optimistic job to the queue immediately
    setJobs((prev) => [optimisticJob, ...prev]);

    // Show toast immediately
    toast.info(`Generation started for "${prompt.substring(0, 30)}..."`, {
      description: `Job queued. You can continue working while it processes.`,
    });

    try {
      let imageUrl = sourceImage;

      // If using uploaded file, first upload it
      if ((generationMode === "image-to-image" || generationMode === "image-to-video") && sourceImageFile) {
        const uploadData = await uploadMutation.mutateAsync(sourceImageFile);
        imageUrl = uploadData.url;
      }

      const requestBody: any = {
        prompt,
        negativePrompt: negativePrompt || undefined,
        model,
        aspectRatio,
        numImages,
        steps: steps || undefined,
        guidance: guidance || undefined,
        seed: seed ? parseInt(seed) : undefined,
        generationMode,
      };

      // Add img2img specific parameters
      if (generationMode === "image-to-image") {
        requestBody.imageUrl = imageUrl;
        requestBody.strength = strength;
      }

      // Add video specific parameters for image-to-video mode
      if (generationMode === "image-to-video") {
        requestBody.imageUrl = imageUrl;
        requestBody.resolution = resolution;
        requestBody.duration = duration;
      }

      // Submit job using mutation
      const data = await submitJobMutation.mutateAsync(requestBody);

      // Replace optimistic job with real job data
      setJobs((prev) =>
        prev.map((job) =>
          job.id === optimisticJobId
            ? {
                ...job,
                id: data.jobId,
                status: data.status,
                parameters: requestBody,
              }
            : job
        )
      );
    } catch (err: any) {
      // Remove optimistic job on error
      setJobs((prev) => prev.filter((job) => job.id !== optimisticJobId));

      const errorMessage = err.message || "Failed to start generation";
      setError(errorMessage);
      toast.error("Generation failed to start", {
        description: errorMessage,
      });
    }
  };

  return (
    <>
      <style jsx global>{`
        /* Modern Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #09090b;
        }
        ::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }

        /* Aspect Ratio Selection State */
        .ratio-btn.active {
          border-color: #6366f1;
          background-color: rgba(99, 102, 241, 0.1);
          color: white;
        }
        .ratio-btn.active div {
          border-color: #6366f1;
        }

        /* Glassmorphism Utilities */
        .glass {
          background: rgba(24, 24, 27, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .image-overlay {
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.9) 0%,
            rgba(0, 0, 0, 0.4) 50%,
            rgba(0, 0, 0, 0) 100%
          );
        }
      `}</style>

      <div className="bg-transparent text-zinc-300 font-sans h-full flex overflow-hidden selection:bg-brand-500 selection:text-white">
        {/* MAIN CONTENT (Canvas/Gallery) */}
        <main className="flex-1 flex flex-col relative min-w-0 bg-transparent">
          {/* Page Header */}
          <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 py-4 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Canvas
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              {/* Mobile Toggle for Right Sidebar */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Area */}
          <div
            className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth"
            id="gallery-container"
          >
            {/* Active Jobs Queue */}
            {jobs.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4" /> Generation Queue
                </h2>
                <div className="space-y-3">
                  {jobs
                    .filter(
                      (job) =>
                        job.status === "pending" || job.status === "processing"
                    )
                    .map((job) => (
                      <div
                        key={job.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4"
                      >
                        <div className="flex-shrink-0">
                          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {job.prompt}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {job.status === "pending"
                              ? "Waiting to start..."
                              : "Generating images..."}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-xs text-zinc-500">
                          {job.modelId}
                        </div>
                      </div>
                    ))}
                  {jobs
                    .filter((job) => job.status === "failed")
                    .slice(0, 3)
                    .map((job) => (
                      <div
                        key={job.id}
                        className="bg-red-950/20 border border-red-900/30 rounded-lg p-4 flex items-center gap-4"
                      >
                        <div className="flex-shrink-0">
                          <X className="w-6 h-6 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {job.prompt}
                          </p>
                          <p className="text-xs text-red-400 mt-1">
                            {job.errorMessage || "Generation failed"}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Latest Generation Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Just Now
                </h2>
                <div className="flex space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === "grid"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-500 hover:text-white"
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === "list"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-500 hover:text-white"
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
                    : "flex flex-col gap-4"
                }
                id="generation-grid"
              >
                {/* Loading/Processing State */}
                {loading && (
                  <div
                    className={`relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 border-dashed flex flex-col items-center justify-center p-6 text-center group cursor-wait ${
                      viewMode === "grid" ? "aspect-[3/4]" : "h-32"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-800 animate-pulse"></div>
                    <div className="relative z-10">
                      <div className="animate-spin mb-4 inline-block">
                        <Loader2 className="w-8 h-8 text-brand-500" />
                      </div>
                      <p className="text-sm font-medium text-zinc-300">
                        Rendering...
                      </p>
                      <div className="w-32 bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden mx-auto border border-zinc-700">
                        <div className="bg-brand-500 w-2/3 h-full rounded-full animate-pulse"></div>
                      </div>
                      <span className="text-xs text-zinc-500 mt-2 font-mono">
                        1.2s remaining
                      </span>
                    </div>
                  </div>
                )}

                {/* Generated Images */}
                {generatedImages.map((image, idx) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, image.fileUrl)}
                    className={`group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl hover:border-zinc-600 transition-all duration-300 cursor-grab active:cursor-grabbing ${
                      viewMode === "grid"
                        ? "aspect-[3/4]"
                        : "flex flex-row h-32"
                    }`}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setLightboxOpen(true);
                    }}
                  >
                    <MediaRenderer
                      src={image.fileUrl}
                      alt={image.prompt}
                      format={image.format}
                      className={
                        viewMode === "grid"
                          ? "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                          : "w-32 h-full object-cover transition-transform duration-700 group-hover:scale-105 flex-shrink-0 pointer-events-none"
                      }
                      draggable={false}
                    />

                    {/* List view content */}
                    {viewMode === "list" && (
                      <div className="flex-1 flex items-center justify-between p-4 gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300 line-clamp-2 mb-2">
                            {image.prompt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>{image.modelId}</span>
                            <span>
                              {image.width} × {image.height}
                            </span>
                            {image.parameters?.seed && (
                              <span className="font-mono">
                                Seed: {image.parameters.seed}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-brand-600 transition-colors border border-zinc-700 hover:border-brand-500"
                            title="Upscale"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateVariation(image);
                            }}
                            className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-brand-600 transition-colors border border-zinc-700 hover:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Variations"
                            disabled={createVariationMutation.isPending}
                          >
                            {createVariationMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(image.id);
                            }}
                            className={`p-2 rounded-lg hover:bg-brand-600 transition-colors border border-zinc-700 hover:border-brand-500 ${
                              image.isFavorite
                                ? "bg-brand-600 text-white"
                                : "bg-zinc-800 text-white"
                            }`}
                            title="Favorite"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                image.isFavorite ? "fill-current" : ""
                              }`}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="p-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Grid view overlay */}
                    {viewMode === "grid" && (
                      <div className="absolute inset-0 image-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-2">
                            <button
                              className="p-2 bg-zinc-900/90 backdrop-blur-sm text-white rounded-lg hover:bg-brand-600 transition-colors border border-zinc-700 hover:border-brand-500"
                              title="Upscale"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateVariation(image);
                              }}
                              className="p-2 bg-zinc-900/90 backdrop-blur-sm text-white rounded-lg hover:bg-brand-600 transition-colors border border-zinc-700 hover:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Variations"
                              disabled={createVariationMutation.isPending}
                            >
                              {createVariationMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(image.id);
                              }}
                              className={`p-2 backdrop-blur-sm rounded-lg hover:bg-brand-600 transition-colors border border-zinc-700 hover:border-brand-500 ${
                                image.isFavorite
                                  ? "bg-brand-600 text-white"
                                  : "bg-zinc-900/90 text-white"
                              }`}
                              title="Favorite"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  image.isFavorite ? "fill-current" : ""
                                }`}
                              />
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="p-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono text-zinc-300 border border-white/10">
                      {ASPECT_RATIOS.find(
                        (r) =>
                          r.id ===
                          (image.parameters?.aspectRatio || aspectRatio)
                      )?.label || "Custom"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History Section */}
            <div className="mt-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-zinc-800 flex-1"></div>
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                  Previous Sessions
                </span>
                <div className="h-px bg-zinc-800 flex-1"></div>
              </div>

              {historyImages.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No previous sessions"
                  description="Your generation history will appear here. Start creating images to see them in your session history."
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {historyImages.map((image, idx) => (
                    <div
                      key={image.id}
                      draggable
                      onDragStart={(e) => handleImageDragStart(e, image.fileUrl)}
                      onClick={() => handleHistoryItemClick(image)}
                      className="aspect-square rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden cursor-pointer opacity-70 hover:opacity-100 transition-all hover:scale-105"
                    >
                      <MediaRenderer
                        src={image.fileUrl}
                        alt={image.prompt}
                        format={image.format}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-20"></div>
          </div>
        </main>

        {/* 3. RIGHT SIDEBAR (Controls) */}
        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          ></div>
        )}

        <aside
          className={`fixed inset-y-0 right-0 w-80 lg:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col z-50 transform ${
            mobileSidebarOpen ? "translate-x-0" : "translate-x-full"
          } lg:translate-x-0 transition-transform duration-300 shadow-2xl lg:shadow-none lg:relative`}
        >
          {/* Panel Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800 flex-shrink-0">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-500" />{" "}
              Parameters
            </h2>
            <div className="flex items-center gap-1">
              {/* Presets Dropdown - Simple Implementation */}
              <Select
                className="bg-zinc-900 text-zinc-400 text-xs border-none outline-none w-48 truncate"
                onChange={(e) =>
                  e.target.value && handleLoadPreset(e.target.value)
                }
              >
                <option value="">Load Preset</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>

              <button
                onClick={() => setShowSavePresetModal(true)}
                className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                title="Save Preset"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="lg:hidden p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Generation Mode Switcher */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Mode
              </Label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 border border-zinc-700 rounded-xl">
                <button
                  onClick={() => {
                    const newMode = "text-to-image";
                    setGenerationMode(newMode);
                    setSourceImage(null);
                    setSourceImageFile(null);
                    // Auto-select compatible model if current one doesn't support this mode
                    const availableModels = getAvailableModels(newMode);
                    const currentModelSupported = availableModels.some((m) => m.id === model);
                    if (!currentModelSupported && availableModels.length > 0) {
                      setModel(availableModels[0].id);
                    }
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    generationMode === "text-to-image"
                      ? "bg-brand-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Text-to-Image
                </button>
                <button
                  onClick={() => {
                    const newMode = "image-to-image";
                    setGenerationMode(newMode);
                    // Auto-select compatible model if current one doesn't support this mode
                    const availableModels = getAvailableModels(newMode);
                    const currentModelSupported = availableModels.some((m) => m.id === model);
                    if (!currentModelSupported && availableModels.length > 0) {
                      setModel(availableModels[0].id);
                    }
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    generationMode === "image-to-image"
                      ? "bg-brand-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Image-to-Image
                </button>
                <button
                  onClick={() => {
                    const newMode = "image-to-video";
                    setGenerationMode(newMode);
                    // Auto-select compatible model if current one doesn't support this mode
                    const availableModels = getAvailableModels(newMode);
                    const currentModelSupported = availableModels.some((m) => m.id === model);
                    if (!currentModelSupported && availableModels.length > 0) {
                      setModel(availableModels[0].id);
                    }
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    generationMode === "image-to-video"
                      ? "bg-brand-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Image-to-Video
                </button>
              </div>
            </div>

            {/* Source Image Upload (Image-to-Image or Image-to-Video Mode) */}
            {(generationMode === "image-to-image" || generationMode === "image-to-video") && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Source Image <span className="text-red-400">*</span>
                </Label>
                <div className="space-y-3">
                  {/* Image Preview or Upload */}
                  {sourceImage ? (
                    <div className="relative group">
                      <img
                        src={sourceImage}
                        alt="Source"
                        className="w-full h-48 object-cover rounded-xl border border-zinc-700"
                      />
                      <button
                        onClick={() => {
                          setSourceImage(null);
                          setSourceImageFile(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <FileInput
                        accept="image/*"
                        onChange={handleSourceImageUpload}
                        id="source-image-upload"
                      />
                      <label
                        htmlFor="source-image-upload"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all bg-zinc-950 ${
                          isDragging
                            ? "border-brand-500 bg-brand-500/10 scale-[1.02]"
                            : "border-zinc-700 hover:border-brand-500"
                        }`}
                      >
                        <ImagePlus
                          className={`w-12 h-12 mb-2 transition-colors ${
                            isDragging ? "text-brand-500" : "text-zinc-600"
                          }`}
                        />
                        <span
                          className={`text-sm transition-colors ${
                            isDragging ? "text-brand-400" : "text-zinc-400"
                          }`}
                        >
                          {isDragging
                            ? "Drop your image here"
                            : "Click to upload an image"}
                        </span>
                        <span className="text-xs text-zinc-600 mt-1">
                          {isDragging
                            ? ""
                            : "or drag and drop, or select from your gallery below"}
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Strength Slider (only for image-to-image) */}
                  {generationMode === "image-to-image" && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                          Transformation Strength
                        </Label>
                        <span className="text-xs font-mono text-brand-400">
                          {strength.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={strength}
                        onChange={(e) => setStrength(parseFloat(e.target.value))}
                      />
                      <div className="flex justify-between text-[10px] text-zinc-600 px-1">
                        <span>0 (Subtle)</span>
                        <span>1 (Strong)</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Higher values = more transformation
                      </p>
                    </div>
                  )}

                  {/* Video Controls (for Image-to-Video mode) */}
                  {generationMode === "image-to-video" && (
                    <>
                      {/* Resolution Selector */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                          Video Resolution
                        </Label>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 border border-zinc-700 rounded-xl">
                          <button
                            onClick={() => setResolution("480p")}
                            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              resolution === "480p"
                                ? "bg-brand-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            480p
                          </button>
                          <button
                            onClick={() => setResolution("720p")}
                            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              resolution === "720p"
                                ? "bg-brand-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            720p
                          </button>
                          <button
                            onClick={() => setResolution("1080p")}
                            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              resolution === "1080p"
                                ? "bg-brand-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            1080p
                          </button>
                        </div>
                      </div>

                      {/* Duration Selector */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                          Video Duration
                        </Label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 border border-zinc-700 rounded-xl">
                          <button
                            onClick={() => setDuration(5)}
                            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              duration === 5
                                ? "bg-brand-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            5 seconds
                          </button>
                          <button
                            onClick={() => setDuration(10)}
                            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                              duration === 10
                                ? "bg-brand-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            10 seconds
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Prompt Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Prompt
                </Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLoadPromptModal(true)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-300 font-medium flex items-center gap-1 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
                    title="Load Prompt/Template"
                    data-testid="load-prompt-button"
                  >
                    <FolderOpen className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-300 font-medium flex items-center gap-1 px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
                    title="Save Prompt"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                  <button className="text-[10px] text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 bg-brand-500/10 px-2 py-1 rounded border border-brand-500/20 transition-colors">
                    <Wand className="w-3 h-3" /> Enhance
                  </button>
                </div>
              </div>
              <div className="relative group">
                <Textarea
                  className="w-full h-32"
                  placeholder="Describe your imagination... e.g. A futuristic city with neon lights in the rain, cyberpunk style, highly detailed, 8k"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                  className="absolute bottom-2 right-2 p-1.5 text-zinc-500 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all"
                  title="Random Prompt"
                >
                  <Dices className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Negative Prompt (Collapsible) */}
            <div className="space-y-2">
              <button
                onClick={() => setShowNegativePrompt(!showNegativePrompt)}
                className="flex items-center justify-between w-full text-xs font-semibold text-zinc-400 uppercase tracking-wide hover:text-zinc-200 transition-colors"
              >
                <span>Negative Prompt</span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    showNegativePrompt ? "rotate-90" : ""
                  }`}
                />
              </button>
              {showNegativePrompt && (
                <div className="pt-1">
                  <Textarea
                    className="w-full h-20"
                    placeholder="blur, low quality, watermark, text, deformed"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Model Select */}
            <div className="space-y-2">
              <Label
                className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                data-testid="model-label"
              >
                Model
                <ParameterTooltip content={PARAMETER_TOOLTIPS.model} />
              </Label>
              <div className="relative">
                <Select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  data-testid="model-select"
                >
                  {getAvailableModels(generationMode).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <Label
                className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                data-testid="aspect-ratio-label"
              >
                Aspect Ratio
                <ParameterTooltip content={PARAMETER_TOOLTIPS.aspectRatio} />
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`ratio-btn flex flex-col items-center justify-center gap-1.5 p-2 bg-zinc-950 border border-zinc-700 rounded-xl transition-all group ${
                      aspectRatio === ratio.id
                        ? "active"
                        : "hover:border-zinc-500 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div
                      className={`border-2 rounded-sm transition-colors ${
                        aspectRatio === ratio.id
                          ? "border-current"
                          : "border-zinc-600 group-hover:border-zinc-400"
                      }`}
                      style={{
                        width: `${ratio.w * 4}px`,
                        height: `${ratio.h * 4}px`,
                      }}
                    ></div>
                    <span className="text-[10px] font-medium">
                      {ratio.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
              {/* Image Count */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label
                    className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                    data-testid="image-count-label"
                  >
                    Image Count
                    <ParameterTooltip content={PARAMETER_TOOLTIPS.imageCount} />
                  </Label>
                  <span className="text-xs font-mono text-brand-400">
                    {numImages}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={8}
                  step={1}
                  value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-zinc-600 px-1">
                  <span>1</span>
                  <span>8</span>
                </div>
              </div>

              {/* Guidance Scale */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label
                    className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                    data-testid="guidance-label"
                  >
                    Guidance Scale (CFG)
                    <ParameterTooltip content={PARAMETER_TOOLTIPS.guidance} />
                  </Label>
                  <Input
                    type="number"
                    value={guidance.toString()}
                    onChange={(e) => setGuidance(parseFloat(e.target.value) || 0)}
                    className="w-20 text-center text-xs py-1"
                  />
                </div>
                <Slider
                  min={1}
                  max={20}
                  step={0.5}
                  value={guidance}
                  onChange={(e) => setGuidance(parseFloat(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-zinc-600 px-1">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label
                    className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                    data-testid="steps-label"
                  >
                    Steps
                    <ParameterTooltip content={PARAMETER_TOOLTIPS.steps} />
                  </Label>
                  <Input
                    type="number"
                    value={steps.toString()}
                    onChange={(e) => setSteps(parseInt(e.target.value) || 0)}
                    className="w-20 text-center text-xs py-1"
                  />
                </div>
                <Slider
                  min={10}
                  max={150}
                  step={1}
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-zinc-600 px-1">
                  <span>10</span>
                  <span>150</span>
                </div>
              </div>

              {/* Seed (Hidden by default or simplified) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label
                    className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                    data-testid="seed-label"
                  >
                    Seed
                    <ParameterTooltip content={PARAMETER_TOOLTIPS.seed} />
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Random"
                      className="w-32 text-center text-xs py-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const randomSeed = Math.floor(Math.random() * 1000000);
                        setSeed(randomSeed.toString());
                      }}
                      className="h-7 w-7 shrink-0"
                      title="Randomize seed"
                    >
                      <Dices className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Style Modifiers Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                  data-testid="style-modifiers-label"
                >
                  Style Modifiers
                  <ParameterTooltip
                    content={PARAMETER_TOOLTIPS.styleModifiers}
                  />
                </Label>
              </div>

              {/* Quick-add buttons */}
              <div className="flex flex-wrap gap-2">
                {STYLE_MODIFIERS.map((style) => (
                  <button
                    key={style}
                    onClick={() =>
                      activeStyles.includes(style)
                        ? handleRemoveStyleModifier(style)
                        : handleAddStyleModifier(style)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      activeStyles.includes(style)
                        ? "bg-brand-500/20 text-brand-300 border-brand-500/50"
                        : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600"
                    }`}
                    data-testid={`style-modifier-${style
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              {/* Active Styles Pills */}
              {activeStyles.length > 0 && (
                <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">
                    Active
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeStyles.map((style) => (
                      <span
                        key={style}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20"
                        data-testid={`active-style-${style
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {style}
                        <button
                          onClick={() => handleRemoveStyleModifier(style)}
                          className="ml-1.5 hover:text-white transition-colors"
                          data-testid={`remove-style-${style
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Camera Modifiers Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                  data-testid="camera-modifiers-label"
                >
                  Camera Modifiers
                  <ParameterTooltip
                    content={PARAMETER_TOOLTIPS.cameraModifiers}
                  />
                </Label>
              </div>

              {/* Quick-add buttons */}
              <div className="flex flex-wrap gap-2">
                {CAMERA_MODIFIERS.map((camera) => (
                  <button
                    key={camera}
                    onClick={() =>
                      activeCameras.includes(camera)
                        ? handleRemoveCameraModifier(camera)
                        : handleAddCameraModifier(camera)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      activeCameras.includes(camera)
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                        : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600"
                    }`}
                    data-testid={`camera-modifier-${camera
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {camera}
                  </button>
                ))}
              </div>

              {/* Active Cameras Pills */}
              {activeCameras.length > 0 && (
                <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">
                    Active
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeCameras.map((camera) => (
                      <span
                        key={camera}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20"
                        data-testid={`active-camera-${camera
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {camera}
                        <button
                          onClick={() => handleRemoveCameraModifier(camera)}
                          className="ml-1.5 hover:text-white transition-colors"
                          data-testid={`remove-camera-${camera
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Depth & Angle Modifiers Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5"
                  data-testid="depth-angle-modifiers-label"
                >
                  Camera Angles & Shots
                  <ParameterTooltip
                    content={PARAMETER_TOOLTIPS.depthAngleModifiers}
                  />
                </Label>
              </div>

              {/* Quick-add buttons */}
              <div className="flex flex-wrap gap-2">
                {DEPTH_ANGLE_MODIFIERS.map((modifier) => (
                  <button
                    key={modifier}
                    onClick={() =>
                      activeDepthAngles.includes(modifier)
                        ? handleRemoveDepthAngleModifier(modifier)
                        : handleAddDepthAngleModifier(modifier)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      activeDepthAngles.includes(modifier)
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                        : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600"
                    }`}
                    data-testid={`depth-angle-modifier-${modifier
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {modifier}
                  </button>
                ))}
              </div>

              {/* Active Depth/Angles Pills */}
              {activeDepthAngles.length > 0 && (
                <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">
                    Active
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeDepthAngles.map((modifier) => (
                      <span
                        key={modifier}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20"
                        data-testid={`active-depth-angle-${modifier
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {modifier}
                        <button
                          onClick={() => handleRemoveDepthAngleModifier(modifier)}
                          className="ml-1.5 hover:text-white transition-colors"
                          data-testid={`remove-depth-angle-${modifier
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Spacer for sticky button */}
            <div className="h-24"></div>
          </div>

          {/* Sticky Footer - Generate Button */}
          <div className="absolute bottom-0 w-full p-5 border-t border-zinc-800 bg-zinc-900 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between mb-3 text-xs text-zinc-400">
              <span>
                Cost: <span className="text-white font-bold">4</span> credits
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>{" "}
                Ready
              </span>
            </div>
            <div className="relative group">
              <button
                onClick={handleGenerate}
                disabled={!prompt}
                data-testid="generate-button"
                className="relative inline-flex h-12 w-full overflow-hidden rounded-xl p-[2px] focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#a855f7_0%,#3b82f6_50%,#a855f7_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-zinc-950 px-4 py-1 text-base font-medium text-white backdrop-blur-3xl transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed">
                  <Sparkles className="w-5 h-5 group-hover:animate-pulse fill-white/20" />
                  Generate Images
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Save Prompt Modal */}
        <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
          <DialogContent>
            <DialogHeader onClose={() => setShowSaveModal(false)}>
              Save Prompt
            </DialogHeader>
            <form onSubmit={handleSavePrompt}>
              <DialogBody>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="save-title" className="text-zinc-400">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="save-title"
                      type="text"
                      value={savePromptData.title}
                      onChange={(e) =>
                        setSavePromptData({
                          ...savePromptData,
                          title: e.target.value,
                        })
                      }
                      placeholder="e.g., Cinematic Portrait"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="save-category" className="text-zinc-400">
                      Category
                    </Label>
                    <Input
                      id="save-category"
                      type="text"
                      value={savePromptData.category}
                      onChange={(e) =>
                        setSavePromptData({
                          ...savePromptData,
                          category: e.target.value,
                        })
                      }
                      placeholder="e.g., Portraits"
                      className="mt-1"
                    />
                  </div>

                  <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <Label className="text-xs font-medium mb-1 text-zinc-500 uppercase">
                      Preview
                    </Label>
                    <p className="text-sm text-zinc-300 line-clamp-3">
                      {prompt}
                    </p>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white border-none"
                >
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Load Prompt/Template Modal */}
        <Dialog
          open={showLoadPromptModal}
          onOpenChange={setShowLoadPromptModal}
        >
          <DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col">
            <DialogHeader onClose={() => setShowLoadPromptModal(false)}>
              Load Prompt or Template
            </DialogHeader>
            <DialogBody className="flex-1 overflow-y-auto">
              {savedPrompts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400 mb-2">No saved prompts yet</p>
                  <p className="text-sm text-zinc-500">
                    Save your first prompt to use it later
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {savedPrompts.map((promptItem) => (
                    <button
                      key={promptItem.id}
                      onClick={() => handleLoadPrompt(promptItem)}
                      className="text-left p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-brand-500 transition-colors group"
                      data-testid={`prompt-item-${promptItem.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                            {promptItem.title}
                            {promptItem.isTemplate && (
                              <span className="text-[10px] px-2 py-0.5 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-full">
                                Template
                              </span>
                            )}
                          </h3>
                          {promptItem.category && (
                            <p className="text-xs text-zinc-500 mt-1">
                              {promptItem.category}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-500 transition-colors" />
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {promptItem.promptText}
                      </p>
                      {promptItem.isTemplate &&
                        promptItem.templateVariables?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {promptItem.templateVariables.map(
                              (varName: string) => (
                                <span
                                  key={varName}
                                  className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded"
                                >
                                  {`{${varName}}`}
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </button>
                  ))}
                </div>
              )}
            </DialogBody>
          </DialogContent>
        </Dialog>

        {/* Template Variables Modal */}
        <Dialog
          open={showTemplateVariablesModal && !!selectedTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setShowTemplateVariablesModal(false);
              setSelectedTemplate(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader
              onClose={() => {
                setShowTemplateVariablesModal(false);
                setSelectedTemplate(null);
              }}
            >
              Fill Template Variables
            </DialogHeader>
            <DialogBody>
              <div className="mb-6 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">Template:</p>
                <p className="text-sm text-zinc-300">
                  {selectedTemplate?.title}
                </p>
              </div>

              <div className="space-y-4">
                {selectedTemplate?.templateVariables?.map((varName: string) => (
                  <div key={varName}>
                    <Label className="text-zinc-400 text-sm">
                      {varName} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={templateVariableValues[varName] || ""}
                      onChange={(e) =>
                        setTemplateVariableValues({
                          ...templateVariableValues,
                          [varName]: e.target.value,
                        })
                      }
                      placeholder={`Enter value for ${varName}`}
                      className="mt-1"
                      data-testid={`template-var-${varName}`}
                    />
                  </div>
                ))}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTemplateVariablesModal(false);
                  setSelectedTemplate(null);
                }}
                className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyTemplate}
                className="flex-1 bg-brand-600 hover:bg-brand-500 text-white border-none"
                data-testid="apply-template-button"
              >
                Apply Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Preset Modal */}
        <Dialog
          open={showSavePresetModal}
          onOpenChange={setShowSavePresetModal}
        >
          <DialogContent>
            <DialogHeader onClose={() => setShowSavePresetModal(false)}>
              Save Preset
            </DialogHeader>
            <form onSubmit={handleSavePreset}>
              <DialogBody>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preset-name" className="text-zinc-400">
                      Preset Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="preset-name"
                      type="text"
                      value={savePresetData.name}
                      onChange={(e) =>
                        setSavePresetData({
                          ...savePresetData,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., High Quality Portrait"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="preset-description"
                      className="text-zinc-400"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="preset-description"
                      value={savePresetData.description}
                      onChange={(e) =>
                        setSavePresetData({
                          ...savePresetData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional description"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSavePresetModal(false)}
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white border-none"
                >
                  Save Preset
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={generatedImages}
        currentIndex={selectedImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(index) => setSelectedImageIndex(index)}
        onTagsUpdate={(imageId, tags) => {
          // Update the tags in the generatedImages array
          setGeneratedImages((prev) =>
            prev.map((img) =>
              img.id === imageId ? { ...img, tags } : img
            )
          );
        }}
      />
    </>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-transparent">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <GeneratePageContent />
    </Suspense>
  );
}
