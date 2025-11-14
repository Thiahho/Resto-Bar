import React from "react";
import { useCatalog } from "../../hooks/useCatalog";
import Header from "./Header";
import Footer from "./Footer";
import ProductsCard from "./ProductsCard";
import { Products } from "../../types";

const CatalogPage: React.FC = () => {
  const { products, categories } = useCatalog();

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {categories.map((category) => {
          const categoryProducts = products.filter(
            (p) => p.categoryId === category.id
          );
          if (categoryProducts.length === 0) return null;

          return (
            <section key={category.id} className="mb-12">
              <h2 className="text-3xl font-bold border-b-4 border-primary pb-2 mb-6 text-secondary">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categoryProducts.map((product: Products) => (
                  <ProductsCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </div>
  );
};

export default CatalogPage;
