import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Typography, Paper, IconButton, Avatar } from '@material-ui/core';
import {
  GetApp,
  PictureAsPdf,
  Description,
  TableChart,
  InsertDriveFile,
  Image as ImageIcon,
  Audiotrack,
  Videocam
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    maxWidth: '100%',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  iconContainer: {
    marginRight: theme.spacing(1.5),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 40,
    borderRadius: 4,
    color: '#fff',
    fontSize: 24,
  },
  thumbnail: {
    width: 40,
    height: 40,
    objectFit: 'cover',
    borderRadius: 4,
    marginRight: theme.spacing(1.5),
  },
  details: {
    flexGrow: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  filename: {
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '14px',
    lineHeight: '1.2',
    color: '#303030',
  },
  meta: {
    fontSize: '11px',
    color: '#999',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  action: {
    marginLeft: theme.spacing(1),
  },
  downloadBtn: {
    minWidth: 'auto',
    padding: 8,
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: '#999',
    border: '1px solid #ddd',
    '&:hover': {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderColor: '#ccc',
    }
  },
}));

const getFileIcon = (extension) => {
  const style = { fontSize: 24 };
  switch (extension) {
    case 'pdf':
      return <PictureAsPdf style={style} />;
    case 'doc':
    case 'docx':
    case 'txt':
    case 'rtf':
      return <Description style={style} />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <TableChart style={style} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return <ImageIcon style={style} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <Audiotrack style={style} />;
    case 'mp4':
    case 'avi':
    case 'mkv':
    case 'mov':
      return <Videocam style={style} />;
    default:
      return <InsertDriveFile style={style} />;
  }
};

const getFileColor = (extension) => {
  switch (extension) {
    case 'pdf':
      return '#F44336'; // Material Red
    case 'doc':
    case 'docx':
      return '#2196F3'; // Material Blue
    case 'xls':
    case 'xlsx':
    case 'csv':
      return '#4CAF50'; // Material Green
    case 'ppt':
    case 'pptx':
      return '#FF9800'; // Material Orange
    default:
      return '#7E57C2'; // Material Deep Purple (Generic)
  }
};

const FilePreview = ({ mediaUrl, filename }) => {
  const classes = useStyles();
  
  // Extract extension from mediaUrl first as it is more reliable for type
  let extension = '';
  if (mediaUrl) {
    const urlParts = mediaUrl.split('.').pop().split('?')[0].toLowerCase();
    if (urlParts.length <= 4) { // Likely an extension
      extension = urlParts;
    }
  }

  // Fallback to filename extension if mediaUrl didn't give a valid one
  if (!extension && filename && filename.includes('.')) {
    extension = filename.split('.').pop().toLowerCase();
  }

  // If still no extension, default
  if (!extension) extension = 'file';

  // Determine display filename
  let displayFilename = filename;
  if (!displayFilename && mediaUrl) {
    // Try to extract from URL: timestamp-name.ext
    const nameParts = mediaUrl.split('/').pop().split('-');
    if (nameParts.length > 1) {
       displayFilename = nameParts.slice(1).join('-'); // Remove timestamp prefix
    } else {
       displayFilename = nameParts[0];
    }
  }

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);

  return (
    <div className={classes.root}>
      {isImage && mediaUrl ? (
        <img src={mediaUrl} alt={displayFilename} className={classes.thumbnail} />
      ) : (
        <div 
          className={classes.iconContainer} 
          style={{ backgroundColor: getFileColor(extension) }}
        >
          {getFileIcon(extension)}
        </div>
      )}

      <div className={classes.details}>
        <Typography variant="body2" className={classes.filename} title={displayFilename}>
          {displayFilename || 'Download'}
        </Typography>
        <div className={classes.meta}>
           {extension.toUpperCase()} 
        </div>
      </div>

      <div className={classes.action}>
        <Button
          className={classes.downloadBtn}
          variant="contained"
          color="primary"
          href={mediaUrl}
          target="_blank"
          download
        >
          <GetApp fontSize="small" />
        </Button>
      </div>
    </div>
  );
};

export default FilePreview;
