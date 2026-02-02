import React from "react";
import { useCatalog } from "../../hooks/useCatalog";
import { Link } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { products, categories, businessInfo, isLoading } = useCatalog();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800">Panel</h1>
      <p className="mt-2 text-gray-600">
        Bienvenido al panel de administración {businessInfo?.name ? ` for ${businessInfo.name}` : ''}.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">
            Productos totales
          </h2>
          <p className="text-4xl font-bold text-primary mt-2">
            {products.length}
          </p>
          <Link
            to="/admin/products"
            className="text-sm text-blue-500 hover:underline mt-4 block"
          >
            Gestionar productos
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">
            Total Categorias
          </h2>
          <p className="text-4xl font-bold text-accent mt-2">
            {categories.length}
          </p>
          <Link
            to="/admin/categories"
            className="text-sm text-blue-500 hover:underline mt-4 block"
          >
            Gestionar Categorias
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Configuracion de la tienda</h2>
          <p className="text-gray-600 mt-2">
            Gestiona tu horario comercial, información de contacto y banner.
          </p>
          <Link
            to="/admin/settings"
            className="text-sm text-blue-500 hover:underline mt-4 block"
          >
            Actualizar configuración
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Crecimiento SaaS</h2>
          <p className="text-gray-600 mt-2">
            Activa upselling automático, combos inteligentes y pricing dinámico.
          </p>
          <Link
            to="/admin/growth"
            className="text-sm text-blue-500 hover:underline mt-4 block"
          >
            Configurar crecimiento
          </Link>
        </div>
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700">
          Guía de inicio rápido
        </h2>
        <p className="mt-4 text-gray-600">
          Esta es una aplicación de catálogo ligera, exclusiva para el frontend. Todos los datos que modifiques aquí se almacenan en la memoria de tu navegador y se restablecerán al actualizar la página. 
          Esta demo está diseñada para mostrar la interfaz de usuario y las funciones con inteligencia artificial.
        </p>
        <p className="mt-2 text-gray-600">
        Para que los cambios sean permanentes, esta interfaz de usuario necesitaría
       estar conectada a un servidor backend y a una base de datos (como la aplicación ASP.NET Coreque solicitó originalmente).
        </p>
        <p className="mt-2 font-semibold text-gray-700">Cómo personalizar:</p>
        <ul className="list-disc list-inside mt-2 text-gray-600">
          <li>
            Ir a{" "}
            <Link
              to="/admin/products"
              className="text-blue-500 hover:underline"
            >
              Productos
            </Link>{" "}
            Para añadir, editar o eliminar elementos.
          </li>
          <li>
            Usa{" "}
            <Link
              to="/admin/categories"
              className="text-blue-500 hover:underline"
            >
              Categorias
            </Link>{" "}
            Sección para organizar tus productos.
          </li>
          <li>
            Actualiza la información de tu negocio en{" "}
            <Link
              to="/admin/settings"
              className="text-blue-500 hover:underline"
            >
              Configuracion de la tienda
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
