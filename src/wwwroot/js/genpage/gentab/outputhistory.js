let currentGenerationOutputFolderInput = null;
let currentGenerationOutputFolderStatus = null;

/**
 * Cleans a history folder path for UI usage.
 */
function cleanHistoryFolderPath(path) {
    return (path || '').replaceAll('\\', '/').split('/').map(part => part.trim()).filter(part => part).join('/');
}

/**
 * Returns whether a history path points at a reserved/special folder.
 */
function isReservedHistoryFolderPath(path) {
    let clean = cleanHistoryFolderPath(path);
    return clean.startsWith('_') || clean == 'Starred' || clean.startsWith('Starred/');
}

/**
 * Returns the parent folder of a history path.
 */
function getHistoryParentFolder(path) {
    let clean = cleanHistoryFolderPath(path);
    let parts = clean.split('/');
    parts.pop();
    return parts.join('/');
}

/**
 * Returns the last path component of a history path.
 */
function getHistoryLastPart(path) {
    let clean = cleanHistoryFolderPath(path);
    let parts = clean.split('/');
    return parts.pop() || '';
}

/**
 * Updates the one-shot output folder status label.
 */
function updateCurrentGenerationOutputFolderStatus() {
    if (!currentGenerationOutputFolderInput || !currentGenerationOutputFolderStatus) {
        return;
    }
    let value = cleanHistoryFolderPath(currentGenerationOutputFolderInput.value);
    currentGenerationOutputFolderInput.value = value;
    currentGenerationOutputFolderStatus.innerText = value ? `Next batch: ${value}` : 'Default output path';
    currentGenerationOutputFolderStatus.title = currentGenerationOutputFolderStatus.innerText;
}

/**
 * Sets the one-shot output folder for the next generation.
 */
function setCurrentGenerationOutputFolder(path, shouldNotify = false) {
    if (!currentGenerationOutputFolderInput) {
        return;
    }
    currentGenerationOutputFolderInput.value = cleanHistoryFolderPath(path);
    updateCurrentGenerationOutputFolderStatus();
    if (shouldNotify) {
        doNoticePopover(currentGenerationOutputFolderInput.value ? 'Next batch folder set.' : 'Using default output path.', currentGenerationOutputFolderInput.value ? 'notice-pop-green' : 'notice-pop-yellow');
    }
}

/**
 * Clears the one-shot output folder after a generation is queued.
 */
function clearCurrentGenerationOutputFolderAfterGenerate() {
    setCurrentGenerationOutputFolder('', false);
}

/**
 * Initializes the one-shot output folder controls beside the generate button.
 */
function initCurrentGenerationOutputFolderControls() {
    currentGenerationOutputFolderInput = document.getElementById('current_generation_output_folder');
    currentGenerationOutputFolderStatus = document.getElementById('current_generation_output_folder_status');
    let useCurrentButton = document.getElementById('current_generation_output_folder_from_history');
    let clearButton = document.getElementById('current_generation_output_folder_clear');
    if (!currentGenerationOutputFolderInput || !currentGenerationOutputFolderStatus || !useCurrentButton || !clearButton) {
        return;
    }
    if (currentGenerationOutputFolderInput.dataset.has_init == 'true') {
        updateCurrentGenerationOutputFolderStatus();
        return;
    }
    currentGenerationOutputFolderInput.dataset.has_init = 'true';
    currentGenerationOutputFolderInput.addEventListener('input', updateCurrentGenerationOutputFolderStatus);
    useCurrentButton.addEventListener('click', () => {
        let folder = cleanHistoryFolderPath(imageHistoryBrowser?.folder || '');
        if (!folder) {
            showError('Select a history subfolder first, or type a folder manually.');
            return;
        }
        if (isReservedHistoryFolderPath(folder)) {
            showError('Special history folders cannot be used as generation targets.');
            return;
        }
        setCurrentGenerationOutputFolder(folder, true);
    });
    clearButton.addEventListener('click', () => {
        setCurrentGenerationOutputFolder('', true);
    });
    updateCurrentGenerationOutputFolderStatus();
}

/**
 * Updates enabled state for history folder action buttons.
 */
function updateHistoryFolderActionButtons() {
    let folder = cleanHistoryFolderPath(imageHistoryBrowser?.folder || '');
    let isEditable = folder && !isReservedHistoryFolderPath(folder);
    let useButton = document.getElementById('image_history_use_folder_button');
    let renameButton = document.getElementById('image_history_rename_folder_button');
    if (useButton) {
        useButton.disabled = !isEditable;
    }
    if (renameButton) {
        renameButton.disabled = !isEditable;
    }
}

/**
 * Prompts for and creates a history folder.
 */
function createHistoryFolderPrompt() {
    let baseFolder = cleanHistoryFolderPath(imageHistoryBrowser?.folder || '');
    if (isReservedHistoryFolderPath(baseFolder)) {
        baseFolder = '';
    }
    let defaultVal = baseFolder ? `${baseFolder}/` : '';
    let newFolder = prompt('Enter the history folder path to create.', defaultVal);
    if (newFolder == null) {
        return;
    }
    newFolder = cleanHistoryFolderPath(newFolder);
    if (!newFolder) {
        showError('Folder path cannot be empty.');
        return;
    }
    genericRequest('CreateHistoryFolder', { 'path': newFolder }, data => {
        if (data.error) {
            showError(data.error);
            return;
        }
        imageHistoryBrowser.navigate(data.path || newFolder);
        doNoticePopover('Folder created.', 'notice-pop-green');
    });
}

/**
 * Prompts for and renames the current history folder.
 */
function renameHistoryFolderPrompt() {
    let currentFolder = cleanHistoryFolderPath(imageHistoryBrowser?.folder || '');
    if (!currentFolder || isReservedHistoryFolderPath(currentFolder)) {
        showError('Select a normal history folder before renaming it.');
        return;
    }
    let newName = prompt('Enter the new folder name.', getHistoryLastPart(currentFolder));
    if (newName == null) {
        return;
    }
    newName = cleanHistoryFolderPath(newName);
    if (!newName) {
        showError('Folder name cannot be empty.');
        return;
    }
    let parentFolder = getHistoryParentFolder(currentFolder);
    let targetFolder = parentFolder ? `${parentFolder}/${newName}` : newName;
    genericRequest('RenameHistoryFolder', { 'path': currentFolder, 'newPath': targetFolder }, data => {
        if (data.error) {
            showError(data.error);
            return;
        }
        imageHistoryBrowser.navigate(data.path || targetFolder);
        doNoticePopover('Folder renamed.', 'notice-pop-green');
    });
}

/**
 * Moves a saved history file into another dataset folder.
 */
function moveHistoryImagePrompt(fullsrc, src, metadata, div) {
    if (isReservedHistoryFolderPath(fullsrc)) {
        showError('Special history folders cannot be reorganized here.');
        return;
    }
    let defaultFolder = cleanHistoryFolderPath(imageHistoryBrowser?.folder || '');
    if (!defaultFolder || isReservedHistoryFolderPath(defaultFolder)) {
        defaultFolder = getHistoryParentFolder(fullsrc);
    }
    let targetFolder = prompt('Move image to folder:', defaultFolder);
    if (targetFolder == null) {
        return;
    }
    targetFolder = cleanHistoryFolderPath(targetFolder);
    if (!targetFolder) {
        showError('Target folder cannot be empty.');
        return;
    }
    genericRequest('MoveHistoryImage', { 'path': fullsrc, 'targetFolder': targetFolder }, data => {
        if (data.error) {
            showError(data.error);
            return;
        }
        if (div) {
            div.remove();
        }
        let currentImage = currentImageHelper.getCurrentImage();
        if (currentImage && currentImage.dataset.src == src) {
            imageFullView.close();
            setCurrentImage(data.url, metadata, 'history');
        }
        imageHistoryBrowser.lightRefresh();
        doNoticePopover('Image moved.', 'notice-pop-green');
    });
}

/**
 * Lists history folders and files for the browser.
 */
function listOutputHistoryFolderAndFiles(path, isRefresh, callback, depth) {
    let safeDepth = parseInt(depth);
    if (Number.isNaN(safeDepth) || safeDepth < 1) {
        safeDepth = 3;
        localStorage.setItem('browser_imagehistorybrowser_depth', `${safeDepth}`);
        let depthInput = document.getElementById('imagehistorybrowser_depth_input');
        if (depthInput) {
            depthInput.value = `${safeDepth}`;
        }
    }
    let sortBy = localStorage.getItem('image_history_sort_by') ?? 'Name';
    let reverse = localStorage.getItem('image_history_sort_reverse') == 'true';
    let allowAnims = localStorage.getItem('image_history_allow_anims') != 'false';
    let sortElem = document.getElementById('image_history_sort_by');
    let sortReverseElem = document.getElementById('image_history_sort_reverse');
    let allowAnimsElem = document.getElementById('image_history_allow_anims');
    let fix = null;
    if (sortElem) {
        sortBy = sortElem.value;
        reverse = sortReverseElem.checked;
        allowAnims = allowAnimsElem.checked;
    }
    else {
        fix = () => {
            let builtSortElem = document.getElementById('image_history_sort_by');
            let builtSortReverseElem = document.getElementById('image_history_sort_reverse');
            let builtAllowAnimsElem = document.getElementById('image_history_allow_anims');
            builtSortElem.value = sortBy;
            builtSortReverseElem.checked = reverse;
            builtSortElem.addEventListener('change', () => {
                localStorage.setItem('image_history_sort_by', builtSortElem.value);
                imageHistoryBrowser.lightRefresh();
            });
            builtSortReverseElem.addEventListener('change', () => {
                localStorage.setItem('image_history_sort_reverse', builtSortReverseElem.checked);
                imageHistoryBrowser.lightRefresh();
            });
            builtAllowAnimsElem.addEventListener('change', () => {
                localStorage.setItem('image_history_allow_anims', builtAllowAnimsElem.checked);
                imageHistoryBrowser.lightRefresh();
            });
            initCurrentGenerationOutputFolderControls();
            let useFolderButton = document.getElementById('image_history_use_folder_button');
            let createFolderButton = document.getElementById('image_history_create_folder_button');
            let renameFolderButton = document.getElementById('image_history_rename_folder_button');
            if (useFolderButton && useFolderButton.dataset.has_init != 'true') {
                useFolderButton.dataset.has_init = 'true';
                useFolderButton.addEventListener('click', () => {
                    let folder = cleanHistoryFolderPath(imageHistoryBrowser.folder);
                    if (!folder || isReservedHistoryFolderPath(folder)) {
                        showError('Select a normal history folder first.');
                        return;
                    }
                    setCurrentGenerationOutputFolder(folder, true);
                });
            }
            if (createFolderButton && createFolderButton.dataset.has_init != 'true') {
                createFolderButton.dataset.has_init = 'true';
                createFolderButton.addEventListener('click', createHistoryFolderPrompt);
            }
            if (renameFolderButton && renameFolderButton.dataset.has_init != 'true') {
                renameFolderButton.dataset.has_init = 'true';
                renameFolderButton.addEventListener('click', renameHistoryFolderPrompt);
            }
            updateHistoryFolderActionButtons();
        }
    }
    let prefix = path == '' ? '' : (path.endsWith('/') ? path : `${path}/`);
    genericRequest('ListImages', { 'path': path, 'depth': safeDepth, 'sortBy': sortBy, 'sortReverse': reverse }, data => {
        let folders = data.folders.sort((a, b) => b.toLowerCase().localeCompare(a.toLowerCase()));
        function isPreSortFile(file) {
            return file.src == 'index.html';
        }
        let preFiles = data.files.filter(file => isPreSortFile(file));
        let postFiles = data.files.filter(file => !isPreSortFile(file));
        data.files = preFiles.concat(postFiles);
        let mapped = data.files.map(file => {
            let fullSrc = `${prefix}${file.src}`;
            return { 'name': fullSrc, 'data': { 'src': `${getImageOutPrefix()}/${fullSrc}`, 'fullsrc': fullSrc, 'name': file.src, 'metadata': interpretMetadata(file.metadata) } };
        });
        callback(folders, mapped);
        updateHistoryFolderActionButtons();
        if (fix) {
            fix();
        }
    });
}

/**
 * Builds the action buttons for a history image.
 */
function buttonsForImage(fullsrc, src, metadata) {
    let isDataImage = src.startsWith('data:');
    let buttons = [];
    if (permissions.hasPermission('user_star_images') && !isDataImage) {
        buttons.push({
            label: (metadata && JSON.parse(metadata).is_starred) ? 'Unstar' : 'Star',
            title: 'Star or unstar this image - starred images get moved to a separate folder and highlighted.',
            className: (metadata && JSON.parse(metadata).is_starred) ? ' star-button button-starred-image' : ' star-button',
            onclick: () => {
                toggleStar(fullsrc, src);
            }
        });
    }
    if (!isDataImage) {
        buttons.push({
            label: 'Use Folder For Next Batch',
            title: 'Set this image folder as the destination for your next generation batch.',
            onclick: () => {
                let folder = getHistoryParentFolder(fullsrc);
                if (!folder || isReservedHistoryFolderPath(folder)) {
                    showError('This image is not in a normal history folder.');
                    return;
                }
                setCurrentGenerationOutputFolder(folder, true);
            }
        });
    }
    if (metadata) {
        buttons.push({
            label: 'Copy Raw Metadata',
            title: `Copies the raw form of the image's metadata to your clipboard (usually JSON text).`,
            onclick: () => {
                copyText(metadata);
                doNoticePopover('Copied!', 'notice-pop-green');
            }
        });
    }
    if (!isDataImage) {
        buttons.push({
            label: 'Move To Folder',
            title: 'Move this image into another history folder for dataset curation.',
            onclick: (div) => {
                moveHistoryImagePrompt(fullsrc, src, metadata, div);
            }
        });
        buttons.push({
            label: 'Copy Path',
            title: 'Copies the relative file path of this image to your clipboard.',
            onclick: () => {
                copyText(fullsrc);
                doNoticePopover('Copied!', 'notice-pop-green');
            }
        });
    }
    if (permissions.hasPermission('local_image_folder') && !isDataImage) {
        buttons.push({
            label: 'Open In Folder',
            title: 'Opens the folder containing this image in your local PC file explorer.',
            onclick: () => {
                genericRequest('OpenImageFolder', { 'path': fullsrc }, data => { });
            }
        });
    }
    buttons.push({
        label: 'Download',
        title: 'Downloads this image to your PC.',
        href: escapeHtmlForUrl(src),
        is_download: true
    });
    if (permissions.hasPermission('user_delete_image') && !isDataImage) {
        buttons.push({
            label: 'Delete',
            title: 'Deletes this image from the server.',
            onclick: (elem) => {
                if (!uiImprover.lastShift && getUserSetting('ui.checkifsurebeforedelete', true) && !confirm('Are you sure you want to delete this image?\nHold shift to bypass.')) {
                    return;
                }
                let deleteBehavior = getUserSetting('ui.deleteimagebehavior', 'next');
                let shifted = deleteBehavior == 'nothing' ? false : shiftToNextImagePreview(deleteBehavior == 'next', imageFullView.isOpen());
                if (!shifted) {
                    imageFullView.close();
                }
                genericRequest('DeleteImage', { 'path': fullsrc }, data => {
                    if (elem) {
                        elem.remove();
                    }
                    let historySection = getRequiredElementById('imagehistorybrowser-content');
                    let div = historySection.querySelector(`.image-block[data-name="${fullsrc}"]`);
                    if (div) {
                        div.remove();
                    }
                    div = historySection.querySelector(`.image-block[data-name="${src}"]`);
                    if (div) {
                        div.remove();
                    }
                    let currentImage = currentImageHelper.getCurrentImage();
                    if (currentImage && currentImage.dataset.src == src) {
                        setCurrentImage(null);
                    }
                    div = getRequiredElementById('current_image_batch').querySelector(`.image-block[data-src="${src}"]`);
                    if (div) {
                        removeImageBlockFromBatch(div);
                    }
                });
            }
        });
    }
    return buttons;
}

/**
 * Describes a history output file for browser display.
 */
function describeOutputFile(image) {
    let buttons = buttonsForImage(image.data.fullsrc, image.data.src, image.data.metadata);
    let parsedMeta = { is_starred: false };
    if (image.data.metadata) {
        let metadata = image.data.metadata;
        try {
            metadata = interpretMetadata(image.data.metadata);
            parsedMeta = JSON.parse(metadata) || parsedMeta;
        }
        catch (e) {
            console.log(`Failed to parse image metadata: ${e}, metadata was ${metadata}`);
        }
    }
    let formattedMetadata = formatMetadata(image.data.metadata);
    let description = image.data.name + "\n" + formattedMetadata;
    let name = image.data.name;
    let allowAnims = localStorage.getItem('image_history_allow_anims') != 'false';
    let allowAnimToggle = allowAnims ? '' : '&noanim=true';
    let forceImage = null;
    let forcePreview = null;
    let extension = image.data.src.split('.').pop();
    if (extension == 'html') {
        forceImage = 'imgs/html.jpg';
        forcePreview = forceImage;
    }
    else if (['wav', 'mp3', 'aac', 'ogg', 'flac'].includes(extension)) {
        forcePreview = 'imgs/audio_placeholder.jpg';
    }
    let dragImage = forceImage ?? `${image.data.src}`;
    let imageSrc = forcePreview ?? `${image.data.src}?preview=true${allowAnimToggle}`;
    let searchable = `${image.data.name}, ${image.data.metadata}, ${image.data.fullsrc}`;
    let detail_list = [escapeHtml(image.data.name), formattedMetadata.replaceAll('<br>', '&emsp;')];
    let aspectRatio = parsedMeta.sui_image_params?.width && parsedMeta.sui_image_params?.height ? parsedMeta.sui_image_params.width / parsedMeta.sui_image_params.height : null;
    return { name, description, buttons, 'image': imageSrc, 'dragimage': dragImage, className: parsedMeta.is_starred ? 'image-block-starred' : '', searchable, display: name, detail_list, aspectRatio };
}

/**
 * Selects an output from history into the main viewer.
 */
function selectOutputInHistory(image, div) {
    lastHistoryImage = image.data.src;
    lastHistoryImageDiv = div;
    let curImg = currentImageHelper.getCurrentImage();
    if (curImg && curImg.dataset.src == image.data.src) {
        curImg.dataset.batch_id = 'history';
        curImg.click();
        return;
    }
    if (image.data.name.endsWith('.html')) {
        window.open(image.data.src, '_blank');
    }
    else {
        if (!div.dataset.metadata) {
            div.dataset.metadata = image.data.metadata;
            div.dataset.src = image.data.src;
        }
        setCurrentImage(image.data.src, div.dataset.metadata, 'history');
    }
}

let imageHistoryBrowser = new GenPageBrowserClass('image_history', listOutputHistoryFolderAndFiles, 'imagehistorybrowser', 'Thumbnails', describeOutputFile, selectOutputInHistory,
    `<label for="image_history_sort_by">Sort:</label> <select id="image_history_sort_by"><option>Name</option><option>Date</option></select> <input type="checkbox" id="image_history_sort_reverse"> <label for="image_history_sort_reverse">Reverse</label> &emsp; <input type="checkbox" id="image_history_allow_anims" checked autocomplete="off"> <label for="image_history_allow_anims">Allow Animation</label> <button type="button" class="basic-button browser-header-action-button translate" id="image_history_use_folder_button">Use Folder</button> <button type="button" class="basic-button browser-header-action-button translate" id="image_history_create_folder_button">New Folder</button> <button type="button" class="basic-button browser-header-action-button translate" id="image_history_rename_folder_button">Rename Folder</button>`);
imageHistoryBrowser.folderSelectedEvent = () => updateHistoryFolderActionButtons();

/**
 * Stores an image directly into history using the current generation parameters.
 */
function storeImageToHistoryWithCurrentParams(img) {
    let data = getGenInput();
    data['image'] = img;
    delete data['initimage'];
    delete data['maskimage'];
    genericRequest('AddImageToHistory', data, res => {
        mainGenHandler.gotImageResult(res.images[0].image, res.images[0].metadata, '0');
    });
}
