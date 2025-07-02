export default function AppBuilder() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">App Builder</h1>
        <p className="text-lg text-base-content/70">
          Build powerful web applications with our visual development platform.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Toolbar */}
        <div className="col-span-1">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Components</h2>
              <div className="space-y-2">
                <button className="btn btn-outline btn-sm w-full justify-start">
                  📄 Text
                </button>
                <button className="btn btn-outline btn-sm w-full justify-start">
                  🔘 Button
                </button>
                <button className="btn btn-outline btn-sm w-full justify-start">
                  📊 Chart
                </button>
                <button className="btn btn-outline btn-sm w-full justify-start">
                  📋 Form
                </button>
                <button className="btn btn-outline btn-sm w-full justify-start">
                  🖼️ Image
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="col-span-2">
          <div className="card bg-base-100 shadow-lg min-h-96">
            <div className="card-body">
              <h2 className="card-title">Canvas</h2>
              <div className="border-2 border-dashed border-base-300 rounded-lg min-h-80 flex items-center justify-center">
                <div className="text-center text-base-content/50">
                  <div className="text-4xl mb-2">🎨</div>
                  <p>Drag components here to start building</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="col-span-1">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Properties</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Width</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="100%"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Height</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="auto"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Background</span>
                  </label>
                  <input
                    type="color"
                    className="input input-bordered w-full h-12"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-8 flex justify-between items-center">
        <div className="flex gap-2">
          <button className="btn btn-primary">Save</button>
          <button className="btn btn-outline">Preview</button>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-success">Deploy</button>
          <button className="btn btn-ghost">Share</button>
        </div>
      </div>
    </div>
  );
}
