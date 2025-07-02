import { Link } from "react-router";

export default function Landing() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="hero min-h-96">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Welcome to OpenFoundry</h1>
            <p className="py-6">
              Build powerful applications with our comprehensive development
              platform.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Card */}
      <div className="flex justify-center mt-8">
        {/* App Builder Card */}
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body">
            <h2 className="card-title text-2xl justify-center">
              <span className="text-3xl">🔧</span>
              App Builder
            </h2>
            <p className="text-center">
              Create powerful web applications with our visual app builder. Drag
              and drop components, configure data sources, and deploy instantly.
            </p>
            <div className="card-actions justify-center">
              <Link to="/app-builder" className="btn btn-primary btn-lg">
                Build App
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          Platform Features
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Fast Development</h3>
            <p className="text-base-content/70">
              Accelerate your development process with our intuitive tools and
              pre-built components.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">Beautiful UI</h3>
            <p className="text-base-content/70">
              Create stunning interfaces with our design system and customizable
              themes.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Easy Deployment</h3>
            <p className="text-base-content/70">
              Deploy your applications with one click to various cloud
              platforms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
