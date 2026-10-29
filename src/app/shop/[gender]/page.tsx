import { ShopView } from "@/components/site/shop-view";
import { getProductsByGender } from "@/data/products";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ gender: string }> };

export default async function GenderShopPage({ params }: Props) {
  const { gender } = await params;
  if (gender !== "female" && gender !== "male") notFound();

  return (
    <ShopView
      title={gender === "female" ? "Women" : "Men"}
      products={getProductsByGender(gender)}
    />
  );
}

export function generateStaticParams() {
  return [{ gender: "female" }, { gender: "male" }];
}
