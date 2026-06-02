/* @jsxImportSource react */
import React, { useCallback, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    Typography,
    IconButton,
    LinearProgress,
    Paper,
} from "@material-ui/core";
import {
    CloudUpload as UploadIcon,
    Close as CloseIcon,
    InsertDriveFile as FileIcon,
    Image as ImageIcon,
    PictureAsPdf as PdfIcon,
    Description as DocIcon,
} from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
    dropzone: {
        border: `2px dashed ${theme.palette.primary.light}`,
        borderRadius: 12,
        padding: theme.spacing(3),
        textAlign: "center",
        backgroundColor: "var(--status-info-4)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        "&:hover": {
            backgroundColor: "var(--status-info-8)",
            borderColor: theme.palette.primary.main,
        },
    },
    dropzoneActive: {
        backgroundColor: "var(--status-info-15)",
        borderColor: theme.palette.primary.main,
        borderStyle: "solid",
    },
    uploadIcon: {
        fontSize: 48,
        color: theme.palette.primary.main,
        marginBottom: theme.spacing(1),
    },
    fileList: {
        marginTop: theme.spacing(2),
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing(1),
    },
    fileItem: {
        position: "relative",
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-surface)",
    },
    filePreview: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    fileIcon: {
        fontSize: 32,
        marginBottom: 4,
    },
    fileName: {
        fontSize: 10,
        textAlign: "center",
        padding: "0 4px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        width: "100%",
    },
    removeButton: {
        position: "absolute",
        top: 2,
        right: 2,
        padding: 2,
        backgroundColor: "var(--overlay-dark-medium)",
        color: "var(--bg-surface)",
        "&:hover": {
            backgroundColor: "var(--overlay-dark-strong)",
        },
    },
    pdfIcon: { color: "var(--status-error)" },
    docIcon: { color: "var(--status-info)" },
    xlsIcon: { color: "var(--status-success)" },
    imgIcon: { color: "var(--status-default-text)" },
    defaultIcon: { color: "var(--text-muted)" },
    uploadingOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "var(--overlay-medium)",
        padding: 4,
    },
}));

const getFileIcon = (fileType, classes) => {
    if (fileType.startsWith("image/")) {
        return <ImageIcon className={`${classes.fileIcon} ${classes.imgIcon}`} />;
    }
    if (fileType === "application/pdf") {
        return <PdfIcon className={`${classes.fileIcon} ${classes.pdfIcon}`} />;
    }
    if (fileType.includes("word") || fileType.includes("document")) {
        return <DocIcon className={`${classes.fileIcon} ${classes.docIcon}`} />;
    }
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
        return <FileIcon className={`${classes.fileIcon} ${classes.xlsIcon}`} />;
    }
    return <FileIcon className={`${classes.fileIcon} ${classes.defaultIcon}`} />;
};

const FileUploader = ({
    files = [],
    onFilesChange,
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024, // 10MB
    accept = ["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx"],
    disabled = false,
}) => {
    const classes = useStyles();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const droppedFiles = Array.from(e.dataTransfer.files);
            processFiles(droppedFiles);
        },
        [files, maxFiles, maxSize, onFilesChange]
    );

    const handleFileSelect = useCallback(
        (e) => {
            const selectedFiles = Array.from(e.target.files);
            processFiles(selectedFiles);
            e.target.value = ""; // Reset input
        },
        [files, maxFiles, maxSize, onFilesChange]
    );

    const processFiles = (newFiles) => {
        const validFiles = newFiles.filter((file) => {
            if (file.size > maxSize) {
                console.warn(`Arquivo ${file.name} excede o tamanho máximo`);
                return false;
            }
            return true;
        });

        const totalFiles = [...files, ...validFiles].slice(0, maxFiles);

        // Create preview URLs for images
        const filesWithPreview = totalFiles.map((file) => {
            if (file.preview) return file; // Already has preview
            if (file.type.startsWith("image/")) {
                return Object.assign(file, {
                    preview: URL.createObjectURL(file),
                });
            }
            return file;
        });

        onFilesChange(filesWithPreview);
    };

    const removeFile = (index) => {
        const newFiles = [...files];
        const removed = newFiles.splice(index, 1)[0];
        if (removed.preview) {
            URL.revokeObjectURL(removed.preview);
        }
        onFilesChange(newFiles);
    };

    return (
        <Box>
            <Paper
                className={`${classes.dropzone} ${isDragging ? classes.dropzoneActive : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && document.getElementById("file-upload-input").click()}
                elevation={0}
            >
                <input
                    id="file-upload-input"
                    type="file"
                    multiple
                    accept={accept.join(",")}
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    disabled={disabled}
                />
                <UploadIcon className={classes.uploadIcon} />
                <Typography variant="body1" color="primary">
                    Arraste arquivos aqui ou clique para selecionar
                </Typography>
                <Typography variant="caption" color="textSecondary">
                    Máx. {maxFiles} arquivos, até {Math.round(maxSize / 1024 / 1024)}MB cada
                </Typography>
            </Paper>

            {files.length > 0 && (
                <Box className={classes.fileList}>
                    {files.map((file, index) => (
                        <Box key={index} className={classes.fileItem}>
                            {file.type?.startsWith("image/") && file.preview ? (
                                <img
                                    src={file.preview}
                                    alt={file.name}
                                    className={classes.filePreview}
                                />
                            ) : (
                                <>
                                    {getFileIcon(file.type || "", classes)}
                                    <Typography className={classes.fileName}>
                                        {file.name}
                                    </Typography>
                                </>
                            )}
                            {!disabled && (
                                <IconButton
                                    size="small"
                                    className={classes.removeButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(index);
                                    }}
                                >
                                    <CloseIcon style={{ fontSize: 14 }} />
                                </IconButton>
                            )}
                            {file.uploading && (
                                <Box className={classes.uploadingOverlay}>
                                    <LinearProgress variant="determinate" value={file.progress || 0} />
                                </Box>
                            )}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default FileUploader;
