class DropBoxController {
    constructor() {
        this.currentFolder = ['hcode'];
        this.onSelectionChange = new Event('selectionChange');
        this.navEl = document.querySelector('#browse-location')
        this.btnSendFileEl = document.querySelector('#btn-send-file');
        this.inputFilesEl = document.querySelector('#files');
        this.snackModalEl = document.querySelector('#react-snackbar-root');
        this.progressBarEl = this.snackModalEl.querySelector('.mc-progress-bar-fg');
        this.nameFileEl = this.snackModalEl.querySelector('.filename');
        this.timeleftEl = this.snackModalEl.querySelector('.timeleft');
        this.listFilesEl = document.querySelector('#list-of-files-and-directories');
        this.btnNewFolder = document.querySelector('#btn-new-folder');
        this.btnRename = document.querySelector('#btn-rename');
        this.btnDelete = document.querySelector('#btn-delete');
        this.connectFirebase();
        this.initEvents();
        this.openFolder();

    }

    connectFirebase() {
        const config = {
            apiKey: "AIzaSyCDC9-RAWGozCgdZoDhPl_Af-wceiBk5qk",
            authDomain: "drop-box-clone-98aa4.firebaseapp.com",
            databaseURL: "https://drop-box-clone-98aa4-default-rtdb.firebaseio.com",
            projectId: "drop-box-clone-98aa4",
            storageBucket: "drop-box-clone-98aa4.appspot.com",
            messagingSenderId: "840204038141",
            appId: "1:840204038141:web:5e24ef582b79a9c3927394"
        };

        // Initialize Firebase
        firebase.initializeApp(config);

    }
    getSelection() {
        return this.listFilesEl.querySelectorAll('.selected');
    }
    removeFolderTask(ref, name) {
        return new Promise((resolve, reject) => {
            let folderRef = this.getFirebaseRef(ref + '/' + name);
            folderRef.on('value', snapshot => {
                folderRef.off('value');
                snapshot.forEach(item => {
                    let data = item.val();
                    data.key = item.key;
                    if (data.type === 'folder') {
                        this.removeFolderTask(ref + '/' + name, data.name).then(() => {
                            resolve({
                                fields: {
                                    key: data.key
                                }
                            })
                        }).catch(err => {
                            reject(err);
                        })
                    } else if (data.type) {
                        this.removeFile(ref + '/' + name, data.name).then(() => {
                            resolve({
                                fields: {
                                    key: data.key
                                }
                            })
                        }).catch(err => {
                            reject(err);
                        });
                    }
                });

                folderRef.remove();

            });
        });
    }
    removeTask() {
        let promises = [];

        this.getSelection().forEach((li) => {
            let file = JSON.parse(li.dataset.file);
            let key = li.dataset.key;

            promises.push(new Promise((resolve, reject) => {
                if (file.type === 'folder') {
                    this.removeFolderTask(this.currentFolder.join('/'), file.name).then(() => {
                        resolve({
                            fields: {
                                key
                            }
                        });
                    });
                } else if (file.type) {
                    this.removeFile(this.currentFolder.join('/'), file.name).then(() => {
                        resolve({
                            fields: {
                                key
                            }
                        });
                    });
                }


            }));

        });

        return Promise.all(promises);
    }

    removeFile(ref, name) {
        let fileRef = firebase.storage().ref(ref).child(name);
        return fileRef.delete();

    }
    initEvents() {

        this.btnNewFolder.addEventListener('click', e => {
            let name = prompt('Nome da nova pasta:');
            if (name) {
                this.getFirebaseRef().push().set({
                    name,
                    type: 'folder',
                    path: this.currentFolder.join('/')

                })
                console.log(name);
            }
        });
        this.btnDelete.addEventListener("click", (e) => {
            this.removeTask()
                .then((responses) => {

                    responses.forEach(response => {
                        if (response.fields.key) {
                            this.getFirebaseRef().child(response.fields.key).remove();
                        }
                    })

                    console.log("responses");
                })
                .catch((err) => {
                    console.log(err);
                });
        });
        this.btnRename.addEventListener('click', (e) => {
            let li = this.getSelection()[0];
            let file = JSON.parse(li.dataset.file);
            let name = prompt("Renomear o arquivo:", file.name);
            if (name) {
                file.name = name;
                this.getFirebaseRef().child(li.dataset.key).set(file);
            }
        });
        this.listFilesEl.addEventListener('selectionChange', (e) => {
            switch (this.getSelection().length) {
                case 0:
                    this.btnDelete.style.display = 'none';
                    this.btnRename.style.display = 'none';
                    break;

                case 1:
                    this.btnDelete.style.display = 'block';
                    this.btnRename.style.display = 'block';
                    break;

                default:
                    this.btnDelete.style.display = 'block';
                    this.btnRename.style.display = 'none';
            }

        });
        this.btnSendFileEl.addEventListener('click', (event) => {
            this.inputFilesEl.click();


        });
        this.inputFilesEl.addEventListener('change', (event) => {
            this.btnSendFileEl.disabled = true;
            this.uploadTask(event.target.files).then(responses => {
                responses.forEach(resp => {
                    this.getFirebaseRef().push().set({
                        name: resp.name,
                        type: resp.contentType,
                        path: resp.downloadURLs,
                        size: resp.size

                    });
                })
                this.uploadComplete();
            }).catch(err => {
                this.uploadComplete();
                console.log(err);
            });
            this.modalShow();
        });
    }

    uploadComplete() {
        this.modalShow(false);
        this.inputFilesEl.value = '';
        this.btnSendFileEl.disabled = false;

    }
    getFirebaseRef(path) {
        if (!path) path = this.currentFolder.join('/')
        return firebase.database().ref(path);
    }

    modalShow(show = true) {
        this.snackModalEl.style.display = (show) ? 'block' : 'none';
    }

    ajax(
        url,
        method = "GET",
        formData = new FormData(),
        onprogress = function () {},
        onloadstart = function () {}
    ) {
        return new Promise((resolve, reject) => {
            let ajax = new XMLHttpRequest();

            ajax.open(method, url);

            ajax.onload = (event) => {
                try {
                    resolve(JSON.parse(ajax.responseText));
                } catch (e) {
                    reject(e);
                }
            };

            ajax.onerror = (event) => {
                reject(event);
            };

            ajax.upload.onprogress = onprogress;

            onloadstart();

            ajax.send(formData);
        });
    }

    uploadTask(files) {
        let promises = [];
        [...files].forEach((file) => {

            promises.push(new Promise((resolve, reject) => {
                let fileRef = firebase.storage().ref(this.currentFolder.join('/')).child(file.name)
                let task = fileRef.put(file);
                this.startUploadTime = Date.now()
                task.on('state_changed', snapshot => {
                    this.uploadProgress({
                        loaded: snapshot.bytesTransferred,
                        total: snapshot.totalBytes
                    }, file);
                }, error => {
                    console.error(error);
                    reject(error);
                }, () => {
                    fileRef.getMetadata().then(metadata => {
                        resolve(metadata);
                    }).catch(err => {
                        reject(err);
                    })

                });
            }));
        });
        return Promise.all(promises);

    }
    uploadProgress(event, file) {
        let timespent = Date.now() - this.startUploadTime;
        let loaded = event.loaded;
        let total = event.total;
        let porcent = parseInt((loaded / total) * 100);
        let timeleft = ((100 - porcent) * timespent) / porcent;
        this.progressBarEl.style.width = `${porcent}%`;
        this.nameFileEl.innerHTML = file.name;
        this.timeleftEl.innerHTML = this.formatTimeToHuman(timeleft);
        console.log(timespent, timeleft, porcent);


    }
    formatTimeToHuman(duration) {
        let seconds = parseInt((duration / 1000) % 60);
        let minutes = parseInt((duration / (1000 * 60)) % 60);
        let hours = parseInt((duration / (1000 * 60 * 60)) % 24);
        if (hours > 0) {
            return `${hours} horas, ${minutes} minutos e ${seconds} segundos`
        }
        if (minutes > 0) {
            return `${minutes} minutos e ${seconds} segundos`;
        }
        if (seconds > 0) {
            return `${seconds} segundos`;
        }
        return '';

    }
    getFileIconView(file) {
        switch (file.type) {
            case 'folder':
                return `
          <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
          <title>content-folder-large</title>
          <g fill="none" fill-rule="evenodd">
              <path d="M77.955 53h50.04A3.002 3.002 0 0 1 131 56.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 114.995V45.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z"
                  fill="#71B9F4"></path>
              <path d="M77.955 52h50.04A3.002 3.002 0 0 1 131 55.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 113.995V44.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z"
                  fill="#008B8B"></path>
          </g>
      </svg>`;
                break;

                //-----------------------------------------------word-------------------------//
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return `<svg version="1.1" id="wordicon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                    viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve" width="160" height="160">
               <g>
                   <path fill="#008B8B" d="M67.4,74.4c-0.3-1.4-1.6-2.2-3-1.9c-1.4,0.3-2.2,1.6-1.9,3c0,0,0,0.1,0,0.1l7.5,30.1c0.3,1.3,1.7,2.2,3,1.8
                       c0.9-0.2,1.6-0.9,1.8-1.8L80,87l5.1,18.7c0.4,1.3,1.7,2.1,3.1,1.8c0.9-0.2,1.5-0.9,1.8-1.8l7.5-30.1c0.3-1.4-0.5-2.7-1.9-3
                       c-1.3-0.3-2.6,0.5-3,1.8l-5.2,20.8l-5-18.3c-0.4-1.3-1.7-2.1-3.1-1.8c-0.9,0.2-1.5,0.9-1.8,1.8l-5,18.3L67.4,74.4L67.4,74.4z"/>
                   <path fill="#008B8B" d="M110.1,110.1V62.4L87.5,39.9H59.9c-5.5,0-10,4.5-10,10v60.2c0,5.5,4.5,10,10,10h40.1
                       C105.6,120.1,110.1,115.6,110.1,110.1z M87.5,54.9c0,4.2,3.4,7.5,7.5,7.5h10v47.6c0,2.8-2.2,5-5,5H59.9c-2.8,0-5-2.2-5-5V49.9
                       c0-2.8,2.2-5,5-5h27.6V54.9z"/>
               </g>
               </svg>`;
                break;

                //-----------------------------------------------excel-------------------------//
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return `<svg version="1.1" id="excelicon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve" width="160" height="160">
           <g>
               <path fill="#008B8B" d="M69.4,73.4c-0.9-1.1-2.4-1.3-3.5-0.4s-1.3,2.4-0.4,3.5c0,0,0.1,0.1,0.1,0.1L76.7,90l-11.2,13.5
                   c-0.9,1.1-0.7,2.7,0.4,3.5c1,0.8,2.6,0.7,3.4-0.3L80,94l10.6,12.8c0.9,1.1,2.5,1.2,3.5,0.3c1.1-0.9,1.2-2.5,0.3-3.5l0,0L83.3,90
                   l11.2-13.5c0.9-1.1,0.7-2.7-0.4-3.5c-1-0.8-2.6-0.7-3.4,0.3L80,86.1L69.4,73.4L69.4,73.4z"/>
               <path fill="#008B8B" d="M110.1,110.1V62.4L87.5,39.8H59.9c-5.5,0-10,4.5-10,10v60.2c0,5.5,4.5,10,10,10h40.2
                   C105.6,120.2,110.1,115.7,110.1,110.1z M87.5,54.9c0,4.2,3.4,7.5,7.5,7.5h10v47.7c0,2.8-2.2,5-5,5H59.9c-2.8,0-5-2.2-5-5V49.9
                   c0-2.8,2.2-5,5-5h27.6V54.9z"/>
           </g>
           </svg>`;
                break;

                //-----------------------------------------------pdf-------------------------//
            case 'application/pdf':
                return `
                <svg version="1.1" id="pdficon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve" width="160" height="160">
           <path fill="#108382" d="M110.2,110.2V62.4L87.5,39.7H59.9c-5.6,0-10.1,4.5-10.1,10.1v60.4c0,5.6,4.5,10.1,10.1,10.1h40.3
               C105.7,120.3,110.2,115.8,110.2,110.2z M87.5,54.8c0,4.2,3.4,7.5,7.5,7.5h10.1v47.8c0,2.8-2.3,5-5,5H59.9c-2.8,0-5-2.3-5-5V49.8
               c0-2.8,2.3-5,5-5h27.7v10H87.5z"/>
           <path fill="#108382" d="M62.9,101.4c-1-0.4-1.8-1.2-2.2-2.1c-1-2-0.7-3.9,0.4-5.5c1-1.5,2.6-2.9,4.5-4c2.4-1.3,4.9-2.4,7.5-3.2
               c2-3.6,3.8-7.4,5.3-11.2c-0.9-2.1-1.6-4.3-2.2-6.5c-0.4-2-0.6-4-0.2-5.7c0.4-1.8,1.4-3.4,3.3-4.1c1-0.4,2-0.6,3-0.4
               c1,0.2,1.9,0.9,2.4,1.8c0.4,0.8,0.6,1.8,0.6,2.7c0,0.9-0.1,2-0.2,3.1c-0.4,2.6-1.4,5.7-2.6,9c1.4,3,3,5.8,4.9,8.5
               c2.2-0.2,4.5-0.1,6.7,0.3c1.8,0.3,3.7,1,4.8,2.3c0.6,0.7,1,1.6,1,2.6s-0.2,1.9-0.7,2.8c-0.4,0.8-1,1.6-1.8,2.1s-1.7,0.7-2.6,0.7
               c-1.7-0.1-3.3-1-4.7-2.1c-1.7-1.4-3.2-3-4.6-4.8c-3.4,0.4-6.8,1.1-10,2c-1.5,2.7-3.2,5.2-5.1,7.6c-1.5,1.8-3.1,3.3-4.7,4
               C64.8,101.6,63.8,101.7,62.9,101.4z M69.8,91.8c-0.8,0.4-1.6,0.8-2.3,1.2c-1.7,1-2.7,1.9-3.3,2.8c-0.5,0.7-0.5,1.3-0.2,1.8
               c0.1,0.1,0.1,0.2,0.1,0.2c0.1,0,0.1,0,0.2-0.1c0.7-0.3,1.8-1.2,3.2-2.9C68.3,93.9,69.1,92.8,69.8,91.8z M78,85.1
               c1.7-0.4,3.4-0.7,5.1-1c-0.9-1.4-1.8-2.8-2.6-4.3C79.8,81.6,78.9,83.4,78,85.1L78,85.1z M90.4,87.4c0.8,0.8,1.5,1.5,2.2,2.1
               c1.2,1,2,1.3,2.5,1.3c0.1,0,0.2,0,0.4-0.1c0.2-0.2,0.4-0.4,0.5-0.6c0.2-0.3,0.3-0.7,0.3-1c0-0.1,0-0.2-0.1-0.3
               c-0.3-0.3-1-0.8-2.6-1.1C92.4,87.5,91.4,87.4,90.4,87.4L90.4,87.4z M80.3,69.7c0.4-1.4,0.8-2.8,1-4.2c0.2-0.9,0.2-1.7,0.2-2.3
               c0-0.3-0.1-0.7-0.2-1c-0.3,0-0.5,0.1-0.7,0.2c-0.4,0.2-0.8,0.5-1,1.4c-0.2,1-0.2,2.4,0.2,4.1C80,68.5,80.2,69.1,80.3,69.7L80.3,69.7
               z"/>
           </svg>`;
                break;

                //-----------------------------------------------audio-------------------------//
            case 'audio/mp3':
            case 'audio/mpeg':
            case 'audio/ogg':
                return `<svg version="1.1" id="audioicon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve" width="160" height="160">
           <g>
               <path fill="#108382" d="M95.1,73.2c0-2.8-2.2-5-5-5c-0.4,0-0.8,0.1-1.2,0.2l-5,1.3c-2.2,0.6-3.8,2.6-3.8,4.9V96c-1.6-0.7-3.3-1-5-1
                   c-2.5,0-4.9,0.7-6.7,1.9c-1.8,1.2-3.3,3.2-3.3,5.6c0,2.5,1.5,4.4,3.3,5.6s4.2,1.9,6.7,1.9s4.9-0.7,6.7-1.9c1.8-1.2,3.3-3.2,3.3-5.6
                   v-18l10-2.5V73.2z"/>
               <path fill="#108382" d="M110.1,110.1V62.4L87.5,39.8H59.9c-5.5,0-10,4.5-10,10V110c0,5.5,4.5,10,10,10h40.2
                   C105.6,120.2,110.1,115.7,110.1,110.1z M87.5,54.9c0,4.2,3.4,7.5,7.5,7.5h10v47.7c0,2.8-2.2,5-5,5H59.9c-2.8,0-5-2.2-5-5V49.9
                   c0-2.8,2.2-5,5-5h27.6V54.9z"/>
           </g>
           </svg>`;
                break;

                //-----------------------------------------------video-------------------------//
            case 'video/mp4':
            case 'video/quicktime':

                return `<svg version="1.1" id="videoicon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve" width="160" height="160">
           <g>
               <path fill="#008B8B" d="M70,74.4v21.3c0,1.4,1.1,2.5,2.5,2.5c0.5,0,0.9-0.1,1.3-0.4l17.7-10.6c1.2-0.7,1.6-2.3,0.9-3.4
                   c-0.2-0.4-0.5-0.7-0.9-0.9L73.8,72.2c-1.2-0.7-2.7-0.3-3.4,0.9C70.1,73.5,70,73.9,70,74.4L70,74.4z"/>
               <path fill="#008B8B" d="M110.1,110.1V62.4L87.5,39.8H59.9c-5.5,0-10,4.5-10,10v60.3c0,5.5,4.5,10,10,10h40.2
                   C105.6,120.2,110.1,115.7,110.1,110.1z M87.5,54.9c0,4.2,3.4,7.5,7.5,7.5h10v47.7c0,2.8-2.2,5-5,5H59.9c-2.8,0-5-2.2-5-5V49.9
                   c0-2.8,2.2-5,5-5h27.6V54.9z"/>
           </g>
           </svg>`;
                break;

                //-----------------------------------------------image-------------------------//
            case 'image/jpeg':
            case 'image/jpg':
            case 'image/gif':
            case 'image/png':
                return `<svg version="1.1" id="imageicon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve" width="160" height="160">
           <g>
               <path fill="#008B8B" d="M72.4,75c4.2,0,7.6-3.4,7.6-7.6s-3.4-7.6-7.6-7.6c-4.2,0-7.6,3.4-7.6,7.6S68.3,75,72.4,75z"/>
               <path fill="#008B8B" d="M110.3,110.3c0,5.6-4.5,10.1-10.1,10.1H59.8c-5.6,0-10.1-4.5-10.1-10.1V49.7c0-5.6,4.5-10.1,10.1-10.1h27.7
                   l22.7,22.7V110.3z M59.8,44.7c-2.8,0-5,2.3-5,5v50.5L66,89c0.8-0.8,2.1-1,3.1-0.4L80,95.1l10.9-15.2c0.8-1.1,2.4-1.4,3.5-0.6
                   c0.1,0.1,0.2,0.2,0.3,0.3l10.5,10.5V62.3H95.1c-4.2,0-7.6-3.4-7.6-7.6V44.7H59.8z"/>
           </g>
           </svg>`;
                break;

                //-----------------------------------------------document-------------------------//
            default:
                return `<svg version="1.1" id="documenticon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve" width="160" height="160">
           <path fill="#008B8B" d="M110.2,62.4v47.8c0,5.6-4.5,10.1-10.1,10.1H59.9c-5.6,0-10.1-4.5-10.1-10.1V49.8c0-5.6,4.5-10.1,10.1-10.1
               h27.7L110.2,62.4z M95.1,62.4c-4.2,0-7.5-3.4-7.5-7.5V44.8H59.9c-2.8,0-5,2.3-5,5v60.4c0,2.8,2.3,5,5,5h40.3c2.8,0,5-2.3,5-5V62.4
               H95.1z"/>
           </svg>`;
        }

    }
    getFileView(file, key) {
        let li = document.createElement('li');
        li.dataset.key = key;
        li.dataset.file = JSON.stringify(file);

        li.innerHTML = `
        ${this.getFileIconView(file)}
        <div class="name text-center">${file.name}</div>`

        this.initEventsLi(li);
        return li;

    }
    readFiles() {
        this.lastFolder = this.currentFolder.join('/');
        this.getFirebaseRef().on("value", (snapshot) => {
            this.listFilesEl.innerHTML = "";
            snapshot.forEach((snapshotItem) => {
                let key = snapshotItem.key;
                let data = snapshotItem.val();
                if (data.type) {
                    this.listFilesEl.appendChild(this.getFileView(data, key));
                }


            });
        });
    }

    openFolder() {
        if (this.lastFolder) this.getFirebaseRef(this.lastFolder).off('value');
        this.renderNav();
        this.readFiles();
    }
    renderNav() {
        let nav = document.createElement('nav');
        let path = [];
        for (let i = 0; i < this.currentFolder.length; i++) {
            let folderName = this.currentFolder[i];
            let span = document.createElement('span');
            path.push(folderName);
            if ((i + 1) === this.currentFolder.length) {
                span.innerHTML = folderName;
            } else {
                span.className = 'breadcrumb-segment__wrapper';
                span.innerHTML = `
                  <span class="ue-effect-container uee-BreadCrumbSegment-link-0">
                      <a href="#" data-path="${path.join('/')}" class="breadcrumb-segment">${folderName}</a>
                  </span>
                  <svg width="24" height="24" viewBox="0 0 24 24" class="mc-icon-template-stateless" style="top: 4px; position: relative;">
                      <title>arrow-right</title>
                      <path d="M10.414 7.05l4.95 4.95-4.95 4.95L9 15.534 12.536 12 9 8.464z" fill="#637282"
                          fill-rule="evenodd"></path>
                  </svg>
              `;

            }
            nav.appendChild(span);
        }
        this.navEl.innerHTML = nav.innerHTML;
        this.navEl.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                this.currentFolder = a.dataset.path.split('/');
                this.openFolder();


            })
        })
        /*
        
        */
    }
    initEventsLi(li) {
        li.addEventListener('dblclick', e => {
            let file = JSON.parse(li.dataset.file);
            switch (file.type) {
                case 'folder':
                    this.currentFolder.push(file.name);
                    this.openFolder();
                    this
                    break;
                default:
                    window.open(file.path);
            }

        });
        li.addEventListener('click', e => {


            if (e.shiftKey) {
                let firstLi = this.listFilesEl.querySelector('.selected');
                if (firstLi) {
                    let indexStart;
                    let indexEnd;
                    let lis = li.parentElement.childNodes;
                    lis.forEach((el, index) => {
                        if (firstLi === el) indexStart = index;
                        if (li === el) indexEnd = index;


                    });
                    let index = [indexStart, indexEnd].sort();
                    lis.forEach((el, i) => {
                        if (i >= index[0] && i <= index[1]) {
                            el.classList.add('selected');
                        }
                    });
                    this.listFilesEl.dispatchEvent(this.onSelectionChange);
                    return true;
                }
            }
            if (!e.ctrlKey) {
                this.listFilesEl.querySelectorAll('li.selected').forEach((el) => {
                    el.classList.remove('selected');
                });
            }
            li.classList.toggle('selected');
            this.listFilesEl.dispatchEvent(this.onSelectionChange);
        });
    }
}