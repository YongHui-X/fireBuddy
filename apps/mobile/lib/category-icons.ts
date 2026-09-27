import { resolveCategoryIconId, type Category, type CategoryIconId } from '@firebuddy/shared';
import {
  Award,
  Banknote,
  Briefcase,
  Bus,
  Camera,
  Car,
  CircleHelp,
  Clapperboard,
  Coffee,
  Dumbbell,
  FileText,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  MapPin,
  Percent,
  Plane,
  Shapes,
  Shirt,
  ShoppingBag,
  Smartphone,
  Train,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';

/** The same lucide glyph per icon id as the web app. */
export const categoryIconComponents: Record<CategoryIconId, LucideIcon> = {
  food: Utensils,
  coffee: Coffee,
  transport: Train,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  shopping: ShoppingBag,
  clothing: Shirt,
  utilities: FileText,
  housing: House,
  phone: Smartphone,
  health: HeartPulse,
  fitness: Dumbbell,
  entertainment: Clapperboard,
  gaming: Gamepad2,
  camera: Camera,
  travel: Plane,
  places: MapPin,
  education: GraduationCap,
  gifts: Gift,
  tech: Laptop,
  banking: Landmark,
  others: CircleHelp,
  shapes: Shapes,
  salary: Briefcase,
  bonus: Award,
  dividends: TrendingUp,
  interest: Percent,
  income: Banknote,
};

export function getCategoryIcon(category?: Pick<Category, 'icon'> | null): LucideIcon {
  return categoryIconComponents[resolveCategoryIconId(category?.icon)];
}

export function getIconById(iconId: string): LucideIcon {
  return categoryIconComponents[resolveCategoryIconId(iconId)];
}
