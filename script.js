const dropArea = document.getElementById('drop-area');
const selectFilesBtn = document.getElementById('select-files');
const fileElem = document.getElementById('fileElem');
const sizeSelect = document.getElementById('sizeSelect');
const formatSelect = document.getElementById('formatSelect');
const processBtn = document.getElementById('processBtn');
const progressBar = document.getElementById('progressBar');
const downloadContainer = document.getElementById('downloadContainer');

let images = [];
let processedCount = 0;  // Number of images already converted

selectFilesBtn.addEventListener('click', () => fileElem.click());

fileElem.addEventListener('change', e => {
  handleFiles(e.target.files);
});

dropArea.addEventListener('dragover', e => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', e => {
  dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  if (e.dataTransfer.files) {
    handleFiles(e.dataTransfer.files);
  }
});

function handleFiles(files) {
  for (let file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        images.push({ name: file.name, src: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }
  progressBar.style.display = 'none';
  clearDownloadButtons();
}

function clearDownloadButtons() {
  downloadContainer.innerHTML = '';
}

async function resizeImage(img, width, height, format) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = (width === 'original') ? image.width : width;
      canvas.height = (height === 'original') ? image.height : height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      if (format === 'application/pdf') {
        // For PDF conversion, return base64 JPEG data url (good quality and compatibility)
        const imgData = canvas.toDataURL('image/jpeg');
        resolve(imgData);
      } else {
        canvas.toBlob(blob => resolve(blob), format);
      }
    };
    image.src = img.src;
  });
}

async function processAndPrepareZip(images, width, height, format) {
  if (format === 'application/pdf') {
    // Create PDF with one image per page
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    progressBar.style.display = 'block';
    progressBar.value = 0;

    for (let i = 0; i < images.length; i++) {
      progressBar.value = Math.round((i / images.length) * 100);

      const imgDataUrl = await resizeImage(images[i], width, height, format);

      const imgProps = pdf.getImageProperties(imgDataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    progressBar.value = 100;
    progressBar.style.display = 'none';

    return pdf.output('blob');
  } else {
    // Create zip of images
    const zip = new JSZip();
    progressBar.style.display = 'block';
    progressBar.value = 0;

    for (let i = 0; i < images.length; i++) {
      progressBar.value = Math.round((i / images.length) * 100);

      const blob = await resizeImage(images[i], width, height, format);
      const ext = format.split('/')[1];
      const filename = `resized_${images[i].name.replace(/\.[^/.]+$/, "")}.${ext}`;
      zip.file(filename, blob);
    }

    progressBar.value = 100;
    progressBar.style.display = 'none';

    return await zip.generateAsync({ type: 'blob' });
  }
}

async function processAndPrepareSingleImage(img, width, height, format) {
  if (format === 'application/pdf') {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    progressBar.style.display = 'block';

    const imgDataUrl = await resizeImage(img, width, height, format);

    const imgProps = pdf.getImageProperties(imgDataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    progressBar.style.display = 'none';

    return pdf.output('blob');
  } else {
    progressBar.style.display = 'block';
    const blob = await resizeImage(img, width, height, format);
    progressBar.style.display = 'none';
    return blob;
  }
}

function createDownloadButton(name, blob) {
  const url = URL.createObjectURL(blob);
  const btn = document.createElement('a');
  btn.href = url;
  btn.download = name;
  btn.textContent = `Download ${name}`;
  btn.className = 'download-button';
  btn.onclick = () => {
    // Release the object URL after download starts
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };
  return btn;
}

processBtn.addEventListener('click', async () => {
  if (images.length === 0) {
    alert('Please upload some images first.');
    return;
  }

  // Only process newly added images since last conversion
  const newImages = images.slice(processedCount);

  if (newImages.length === 0) {
    alert('No new images to convert. Please upload more images.');
    return;
  }

  clearDownloadButtons();

  let [w, h] = sizeSelect.value === 'original'
    ? ['original', 'original']
    : sizeSelect.value.split('x').map(Number);

  const format = formatSelect.value;

  if (newImages.length === 1) {
    const blob = await processAndPrepareSingleImage(newImages[0], w, h, format);
    const ext = format === 'application/pdf' ? 'pdf' : format.split('/')[1];
    const filename = `resized_${newImages[0].name.replace(/\.[^/.]+$/, "")}.${ext}`;
    const btn = createDownloadButton(filename, blob);
    downloadContainer.appendChild(btn);
  } else {
    const blob = await processAndPrepareZip(newImages, w, h, format);
    const filename = format === 'application/pdf' ? 'resized_images.pdf' : 'resized_images.zip';
    const btn = createDownloadButton(filename, blob);
    downloadContainer.appendChild(btn);
  }

  // Mark all images as processed
  processedCount = images.length;
});
