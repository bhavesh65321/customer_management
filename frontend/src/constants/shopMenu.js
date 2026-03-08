import {
  ChartBarIcon,
  UsersIcon,
  ShoppingCartIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

export const SHOP_MENU = [
  { name: "Customers", icon: UsersIcon, to: "/customerDashboard" },
  { name: "Charts & Dashboards", icon: ChartBarIcon, to: "/charts" },
  { name: "Workers", icon: UsersIcon, to: "/workers" },
  { name: "Daily Sales", icon: CalendarIcon, to: "/daily-sales" },
  { name: "Shop", icon: ShoppingCartIcon, to: "/shop" },
];
