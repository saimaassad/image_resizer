const dropArea = document.getElementById('drop-area');
const selectFilesBtn = document.getElementById('select-files');
const fileElem = document.getElementById('fileElem');
const sizeSelect = document.getElementById('sizeSelect');
const formatSelect = document.getElementById('formatSelect');
const processBtn = document.getElementById('processBtn');
const downloadLinks = document.getElementById('downloadLinks');
const progressBar = document.getElementById('progressBar');

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
  if(e.dataTransfer.files) {
    handleFiles(e.dataTransfer.files);
  }
});

function handleFiles(files) {
  for(let file of files) {
    if(file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        images.push({name: file.name, src: e.target.result});
      };
      reader.readAsDataURL(file);
    }
  }
  downloadLinks.innerHTML = '';
}

function resizeImage(img, width, height, format) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      if(width === 'original' || height === 'original') {
        canvas.width = image.width;
        canvas.height = image.height;
      } else {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        resolve(blob);
      }, format);
    };
    image.src = img.src;
  });
}

async function processAndDownloadZip(images, width, height, format) {
  const zip = new JSZip();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const blob = await resizeImage(img, width, height, format);
    const ext = format.split('/')[1];
    const filename = `resized_${img.name.replace(/\.[^/.]+$/, "")}.${ext}`;
    zip.file(filename, blob);
  }

  // Generate ZIP file blob
  zip.generateAsync({ type: 'blob' }).then(content => {
    saveAs(content, 'resized_images.zip'); // triggers download using FileSaver.js
  });
}

processBtn.addEventListener('click', async () => {
  if(images.length === 0) {
    alert('Please upload some images first.');
    return;
  }

  let [w, h] = sizeSelect.value.split('x').map(x => parseInt(x));
  if(sizeSelect.value === 'original') {
    w = 'original';
    h = 'original';
  }

  const format = formatSelect.value;
  downloadLinks.innerHTML = '';
  progressBar.style.display = 'block';
  progressBar.value = 0;

  for(let i = 0; i < images.length; i++) {
    progressBar.value = Math.round((i / images.length) * 100);

    const blob = await resizeImage(images[i], w, h, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ext = format.split('/')[1];
    a.href = url;
    a.download = `resized_${images[i].name.replace(/\.[^/.]+$/, "")}.${ext}`;
    a.textContent = `Download ${a.download}`;
    a.style.display = 'block';
    downloadLinks.appendChild(a);
  }
  progressBar.value = 100;
  setTimeout(() => {
    progressBar.style.display = 'none';
  }, 2000);
});
