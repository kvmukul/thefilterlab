<img width="288" height="82" alt="image" src="https://github.com/user-attachments/assets/a4623d11-a302-4d0a-98ef-9bafefbdeba0" />

**An interactive image-processing and machine-vision playground for exploring how filters change an image.**

TheFilterLab lets you experiment with a machine-vision workflow in your browser: choose an image, select a part or inspection scenario, mark a region of interest, build a sequence of image-processing filters, and compare the original with the processed result.

It is designed for learning, prototyping and understanding classical image processing techniques used in industrial inspection. It is not a replacement for a calibrated production vision system.

<img width="1528" height="925" alt="image" src="https://github.com/user-attachments/assets/4e466109-a848-40d5-8c50-3d8c66aab877" /># TheFilterLab


## What can you do?

- **Try images:** use the built-in sample images, upload your own image, or use a webcam.
- **Simulate sensor noise:** add adjustable noise to samples, uploaded images or webcam frames to see how it affects processing.
- **Select a region of interest (ROI):** draw a box on the original image and process only that area, or view the cropped region on its own.
- **Build a filter pipeline:** add multiple filters, adjust their parameters, reorder steps and remove filters.
- **Compare results:** use the before/after slider to compare the processed image with the input.
- **Inspect possible defects:** detect line-like features, local anomalies and small regions, then highlight detected areas on the original image.
- **Count bright connected regions:** enable blob counting and set a minimum area.
- **Save and reload experiments:** copy a JSON recipe containing the pipeline, parameters, ROI, noise level and view settings, then paste it back later.
- **Get a starting point:** choose a part/inspection scenario to see suggested filters and lighting guidance.

<img width="1528" height="925" alt="image" src="https://github.com/user-attachments/assets/39eb1adb-0627-464e-ab19-880be8b6cac6" />


## Filter library

Filters are grouped by the kind of image-processing task they support. You can search the library, read each filter's description and add individual steps to your pipeline.

| Category | What it helps with | Example filters |
|---|---|---|
| Tone | Adjust image intensity and contrast | Grayscale, Brightness / contrast, Gamma, Invert, Contrast stretch, Histogram equalisation, Posterise, Log transform |
| Noise | Reduce noise or bring back detail | Gaussian blur, Median filter, Unsharp mask |
| Edges | Reveal boundaries, lines and fine features | Sobel, Laplacian, Canny, Prewitt, Difference of Gaussians, Emboss |
| Threshold | Separate foreground from background | Binary, Otsu, Adaptive, Range and Niblack threshold |
| Morphology | Refine binary shapes and regions | Erode, Dilate, Opening, Closing, Morphological gradient, Top-hat / black-hat |
| Lighting | Compensate for uneven illumination | Flat-field correction, Local normalisation |
| Colour | Isolate colours and inspect channels | Hue isolate, Channel select, Saturation map, Colour distance |
| Texture | Highlight surface variation and fine detail | Texture (local variance), High-pass |
| Defects | Highlight line defects and local surface changes | Scratch / crack detector, Paint damage / local anomaly, Hysteresis threshold, Remove small specks, Highlight on original |

<img width="563" height="822" alt="image" src="https://github.com/user-attachments/assets/6ea1973a-1a38-4f59-b3dd-0a614b374aff" />

**Tip:** filter order matters. For example, smoothing before edge detection can reduce noise, while colour-based filters generally need to be placed before a step that converts the image to grayscale. The app displays a warning when a colour-dependent step is placed after grayscale processing.

## Inspection scenarios and suggested recipes

The part selector provides example workflows and lighting tips for:

- Shiny or machined metal
- PCB / electronics
- Low-contrast parts
- Printed labels and text
- Scratches and hairline cracks
- Paint damage, chips and peeling
- General surface defects
- Transparent parts and glass
- Colour-coded parts
- Noisy or dim scenes

These recipes are starting points, not guaranteed inspection settings. Real results depend on the camera, lens, lighting, exposure, surface finish and part variation.

## How to use the app

1. **Choose an image** — select a built-in sample, upload an image, or start the webcam.
2. **Choose a part type and region** — select an inspection scenario for a suggested recipe, and optionally draw an ROI on the Original image.
3. **Build the pipeline** — explore filter categories, add steps, adjust their settings and change their order. You can also adjust the simulated input noise here.
4. **Inspect and save** — compare the Original and Result, optionally count bright blobs, and copy the recipe JSON to save your experiment.

When you add a filter, TheFilterLab displays a small confirmation notification.

## Run locally

### Requirements

- [Node.js](https://nodejs.org/) (a current LTS version is recommended)
- A modern browser with JavaScript and Canvas support

There are no third-party npm packages required by the current build and test scripts.

### Build

Clone the repository and run:

```bash
git clone https://github.com/kvmukul/thefilterlab.git
cd thefilterlab
npm run build
```

The build creates a self-contained HTML application at:

```text
dist/TheFilterLab.html
```

Open that HTML file in a modern browser to use the app.

### Run the tests

```bash
npm test
```

The current test command runs the image-processing engine tests in `test/engine.test.js`.

## Project structure

```text
thefilterlab/
├── src/
│   ├── app.js       # UI interactions, image sources, pipeline and workspace
│   ├── body.html    # Application layout and controls
│   ├── engine.js    # Image-processing filters and pipeline runner
│   ├── head.html    # HTML document head
│   ├── samples.js   # Built-in sample images and inspection recipes
│   ├── scene.js     # Visual scene / background effects
│   └── style.css    # Application styling
├── test/
│   └── engine.test.js
├── build.js         # Builds the standalone HTML file
├── package.json
└── dist/
    └── TheFilterLab.html
```

## How it works

- The image-processing engine is written in **JavaScript** and uses browser image data and Canvas APIs.
- The build script combines the source files into one self-contained HTML file.
- Where browser support allows, computationally heavier processing runs in a **Web Worker** so the interface can remain responsive. A main-thread fallback is provided.
- The pipeline runner caches intermediate filter results, so changing a later step can reuse earlier processing.
- Uploaded images and webcam frames can be resized to a selected working resolution before processing.

## Important notes and limitations

- Processing is performed locally in the browser; the app does not need an application server for its image-processing workflow.
- Webcam access requires browser permission and is generally available on **HTTPS or localhost**. If webcam access is unavailable, use image upload instead.
- The built-in samples are generated examples. They are useful for trying the controls, but they do not represent every real-world production condition.
- The printed-label recipe prepares an image for text inspection; **the app does not currently perform OCR or return recognised text**.
- Defect highlights and blob counts are image-processing results, not verified quality decisions. Tune the filters and validate them against representative production images before relying on them.
- Results depend heavily on lighting, focus, exposure, resolution and the physical characteristics of the inspected part.
- The app is an experimental learning and prototyping tool, not a certified measurement, safety or production inspection system.

## Contributing and feedback

Ideas, bug reports and improvements are welcome. If you try TheFilterLab on a real inspection image, useful feedback includes:

- The inspection task and expected result
- The image conditions (lighting, camera angle, surface and resolution)
- The filter sequence and parameter values you used
- What worked, what failed and what you would like to see added

Please avoid sharing confidential production images or sensitive information in public issues.

## License

No license has been specified in this repository yet. Until a license is added, the project should not be assumed to be available for unrestricted reuse, redistribution or modification.
