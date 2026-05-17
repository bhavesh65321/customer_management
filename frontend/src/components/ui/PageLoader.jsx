import React from "react";
import ShopLayout from "../layout/ShopLayout";
import { Spinner } from "./Spinner";

/**
 * PageLoader — full-page loading state inside ShopLayout.
 * Drop-in replacement for:
 *   if (loading) return <ShopLayout><div className="flex justify-center py-20"><div className="animate-spin..."/></div></ShopLayout>;
 */
export function PageLoader() {
  return (
    <ShopLayout>
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" color="blue" />
      </div>
    </ShopLayout>
  );
}

export default PageLoader;
