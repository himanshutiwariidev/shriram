// Maps the icon *names* stored in servicesConfig.js (plain strings, so the
// config stays pure serializable data) to actual lucide-react components.
import {
  Share2, TrendingUp, Megaphone, MapPin, Globe, Smartphone, Tv, Radio,
  Sparkles, Film, Star, Users, CalendarDays, Briefcase,
  BarChart3, Settings, Zap, ShoppingBag, Award, Target, Package,
  FileText, MessageSquare, Music, Camera, Monitor, Layers, PenTool,
  Coffee, Headphones, BookOpen, Heart, Palette, Database, Mail, Phone,
} from "lucide-react";

export const SERVICE_ICONS = {
  Share2, TrendingUp, Megaphone, MapPin, Globe, Smartphone, Tv, Radio,
  Sparkles, Film, Star, Users, CalendarDays, Briefcase,
  BarChart3, Settings, Zap, ShoppingBag, Award, Target, Package,
  FileText, MessageSquare, Music, Camera, Monitor, Layers, PenTool,
  Coffee, Headphones, BookOpen, Heart, Palette, Database, Mail, Phone,
};

export const resolveServiceIcon = (name) => SERVICE_ICONS[name] || Briefcase;
