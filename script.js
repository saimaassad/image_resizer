const dropArea = document.getElementById('drop-area');
const selectFilesBtn = document.getElementById('select-files');
const fileElem = document.getElementById('fileElem');
const sizeSelect = document.getElementById('sizeSelect');
const formatSelect = document.getElementById('formatSelect');
const processBtn = document.getElementById('processBtn');
const progressBar = document.getElementById('progressBar');
const downloadContainer = document.getElementById('downloadContainer');

let images = [];

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

function resizeImage(img, width, height, format) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = (width === 'original') ? image.width : width;
      canvas.height = (height === 'original') ? image.height : height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob), format);
    };
    image.src = img.src;
  });
}

async function processAndPrepareZip(images, width, height, format) {
  const zip = new JSZip();
  progressBar.style.display = 'block';
  progressBar.value = 0;

  for (let i = 0; i < images.length; i++) {
    progressBar.value = Math.round((i / images.length) * 100);

    const img = images[i];
    const blob = await resizeImage(img, width, height, format);
    const ext = format.split('/')[1];
    const filename = `resized_${img.name.replace(/\.[^/.]+$/, "")}.${ext}`;
    zip.file(filename, blob);
  }

  progressBar.value = 100;
  progressBar.style.display = 'none';

  const content = await zip.generateAsync({ type: 'blob' });
  return content;
}

async function processAndPrepareSingleImage(img, width, height, format) {
  progressBar.style.display = 'block';
  const blob = await resizeImage(img, width, height, format);
  progressBar.style.display = 'none';
  return blob;
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

  clearDownloadButtons();

  let [w, h] = sizeSelect.value === 'original'
    ? ['original', 'original']
    : sizeSelect.value.split('x').map(Number);

  const format = formatSelect.value;

  if (images.length === 1) {
    // Single image: resize and prepare download button
    const blob = await processAndPrepareSingleImage(images[0], w, h, format);
    const ext = format.split('/')[1];
    const filename = `resized_${images[0].name.replace(/\.[^/.]+$/, "")}.${ext}`;
    const btn = createDownloadButton(filename, blob);
    downloadContainer.appendChild(btn);
  } else {
    // Multiple images: create zip and prepare download button
    const zipBlob = await processAndPrepareZip(images, w, h, format);
    const btn = createDownloadButton('resized_images.zip', zipBlob);
    downloadContainer.appendChild(btn);
  }
});
