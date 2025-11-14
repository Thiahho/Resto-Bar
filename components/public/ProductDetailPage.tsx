import React from "react";
import { useParams } from "react-router-dom";
import { useCatalog } from "../../hooks/useCatalog";
import { getProductsImageUrl } from "../../services/api/apiClient";
import Header from "./Header";
import Footer from "./Footer";

const ProductsDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { products } = useCatalog();
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return <div>Products not found</div>;
  }

  const imageUrl = product.hasImage
    ? getProductsImageUrl(product.id)
    : "/placeholder.png";

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold">{product.name}</h1>
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full md:w-1/2 mx-auto my-6 rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.png";
            }}
          />
          <p className="text-2xl text-primary font-bold mb-4">
            ${Math.round(product.priceCents / 100).toLocaleString("es-AR")}
          </p>
          <p className="text-lg text-text-light">{product.description}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductsDetailPage;
