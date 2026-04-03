

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { PiPedalModel, PiPedalModelFactory } from './PiPedalModel';
import DialogEx from './DialogEx';
import Link from '@mui/material/Link';
import Toolbar from '@mui/material/Toolbar';
import IconButtonEx from './IconButtonEx';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { Tone3000Client, Tone, Model } from './Tone3000Client';


export interface Tone3000DialogProps {
    open: boolean;
    onClose: () => void;
    uploadPage: string;
    onUploaded: (path: string) => void;
}

type ViewState = 'search' | 'models';

function Tone3000Dialog(props: Tone3000DialogProps) {
    const { open, onClose, uploadPage, onUploaded } = props;

    const model: PiPedalModel = PiPedalModelFactory.getInstance();

    const [openAuthDialog, setOpenAuthDialog] = React.useState(!model.hasTone3000Auth.get());

    // Search state
    const [viewState, setViewState] = React.useState<ViewState>('search');
    const [query, setQuery] = React.useState('');
    const [tones, setTones] = React.useState<Tone[]>([]);
    const [searchLoading, setSearchLoading] = React.useState(false);
    const [searchError, setSearchError] = React.useState<string | null>(null);
    const [hasSearched, setHasSearched] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);

    // Models state
    const [selectedTone, setSelectedTone] = React.useState<Tone | null>(null);
    const [models, setModels] = React.useState<Model[]>([]);
    const [modelsLoading, setModelsLoading] = React.useState(false);
    const [modelsError, setModelsError] = React.useState<string | null>(null);
    const [downloadingId, setDownloadingId] = React.useState<number | null>(null);

    React.useEffect(() => {
        const authListener = (value: boolean) => {
            setOpenAuthDialog(!value);
        };
        model.hasTone3000Auth.addOnChangedHandler(authListener);
        return () => {
            model.hasTone3000Auth.removeOnChangedHandler(authListener);
        };
    });

    function RedirectUrl() {
        const baseUrl = new URL(window.location.href);
        return "http://" + baseUrl.hostname + ":" + baseUrl.port + "/";
    }

    function AuthUrl() {
        return "https://www.tone3000.com/api/v1/auth?redirect_url=" + encodeURIComponent(RedirectUrl()) + "&otp_only=true";
    }

    async function doSearch(searchPage: number = 1) {
        setSearchLoading(true);
        setSearchError(null);
        try {
            const client = new Tone3000Client();
            const result = await client.searchTones({
                query: query || undefined,
                page: searchPage,
                page_size: 20,
                sort: query ? 'best-match' : 'trending',
                gear: ['amp', 'full-rig'],
            });
            if (searchPage === 1) {
                setTones(result.data);
            } else {
                setTones(prev => [...prev, ...result.data]);
            }
            setPage(searchPage);
            setTotalPages(result.total_pages);
            setHasSearched(true);
        } catch (e: any) {
            setSearchError(e.message ?? 'Search failed');
        } finally {
            setSearchLoading(false);
        }
    }

    async function openModels(tone: Tone) {
        setSelectedTone(tone);
        setViewState('models');
        setModels([]);
        setModelsError(null);
        setModelsLoading(true);
        try {
            const client = new Tone3000Client();
            const result = await client.getToneModels(tone.id);
            setModels(result.data);
        } catch (e: any) {
            setModelsError(e.message ?? 'Failed to load models');
        } finally {
            setModelsLoading(false);
        }
    }

    async function downloadModel(m: Model) {
        setDownloadingId(m.id);
        try {
            const client = new Tone3000Client();
            const blob = await client.downloadModelBlob(m.model_url);
            const fileName = m.name.endsWith('.nam') ? m.name : `${m.name}.nam`;
            const file = new File([blob], fileName, { type: 'application/octet-stream' });
            const path = await model.uploadUserFile(uploadPage, file);
            onUploaded(path);
        } catch (e: any) {
            model.showAlert(e.message ?? 'Download failed');
        } finally {
            setDownloadingId(null);
        }
    }

    function handleBackFromModels() {
        setViewState('search');
        setSelectedTone(null);
        setModels([]);
        setModelsError(null);
    }

    function handleSearchKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            doSearch(1);
        }
    }

    const titleText = viewState === 'models' && selectedTone
        ? selectedTone.title
        : 'TONE3000 Models';

    return (
        <DialogEx
            tag="tone3000"
            fullScreen={true}
            open={open}
            onEnterKey={() => { onClose(); }}
            onClose={() => { onClose(); }}
            aria-labelledby="tone3000-dialog-title"
            aria-describedby="tone3000-dialog-description"
        >
            <DialogTitle id="tone3000-dialog-title" sx={{ pb: 0 }}>
                <Toolbar style={{ padding: 0 }}>
                    <IconButtonEx
                        tooltip={viewState === 'models' ? 'Back' : 'Close'}
                        edge="start"
                        color="inherit"
                        aria-label="back"
                        style={{ opacity: 0.6 }}
                        onClick={() => {
                            if (viewState === 'models') {
                                handleBackFromModels();
                            } else {
                                onClose();
                            }
                        }}
                    >
                        <ArrowBackIcon style={{ width: 24, height: 24 }} />
                    </IconButtonEx>
                    <Typography noWrap component="div" sx={{ flexGrow: 1 }}>
                        {titleText}
                    </Typography>
                </Toolbar>

                {viewState === 'search' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search NAM models…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={() => doSearch(1)}
                            disabled={searchLoading}
                            sx={{ whiteSpace: 'nowrap', minWidth: 90 }}
                        >
                            {searchLoading ? <CircularProgress size={20} color="inherit" /> : 'Search'}
                        </Button>
                    </div>
                )}
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>

                {/* ── Search results view ── */}
                {viewState === 'search' && (
                    <>
                        {searchError && (
                            <Typography color="error" sx={{ p: 2 }}>{searchError}</Typography>
                        )}
                        {!hasSearched && !searchLoading && (
                            <Typography color="text.secondary" sx={{ p: 2 }}>
                                Search for NAM amp models, or press Search to browse trending models.
                            </Typography>
                        )}
                        {hasSearched && tones.length === 0 && !searchLoading && (
                            <Typography color="text.secondary" sx={{ p: 2 }}>No results found.</Typography>
                        )}
                        <List disablePadding>
                            {tones.map((tone, idx) => (
                                <React.Fragment key={tone.id}>
                                    {idx > 0 && <Divider />}
                                    <ListItemButton onClick={() => openModels(tone)}>
                                        <ListItemText
                                            primary={tone.title}
                                            secondary={
                                                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                    <span style={{ opacity: 0.7, marginRight: 4 }}>@{tone.user.username}</span>
                                                    <Chip label={tone.gear} size="small" />
                                                    <Chip label={tone.platform} size="small" />
                                                    {tone.sizes?.map(s => <Chip key={s} label={s} size="small" variant="outlined" />)}
                                                </span>
                                            }
                                            secondaryTypographyProps={{ component: 'div' }}
                                        />
                                    </ListItemButton>
                                </React.Fragment>
                            ))}
                        </List>
                        {hasSearched && page < totalPages && !searchLoading && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                                <Button onClick={() => doSearch(page + 1)}>Load more</Button>
                            </div>
                        )}
                        {searchLoading && tones.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                                <CircularProgress size={24} />
                            </div>
                        )}
                    </>
                )}

                {/* ── Models view ── */}
                {viewState === 'models' && (
                    <>
                        {modelsError && (
                            <Typography color="error" sx={{ p: 2 }}>{modelsError}</Typography>
                        )}
                        {modelsLoading && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                                <CircularProgress />
                            </div>
                        )}
                        {!modelsLoading && models.length === 0 && !modelsError && (
                            <Typography color="text.secondary" sx={{ p: 2 }}>No models available.</Typography>
                        )}
                        <List disablePadding>
                            {models.map((m, idx) => (
                                <React.Fragment key={m.id}>
                                    {idx > 0 && <Divider />}
                                    <ListItem
                                        disablePadding
                                        secondaryAction={
                                            <IconButton
                                                edge="end"
                                                aria-label="download"
                                                disabled={downloadingId === m.id}
                                                onClick={() => downloadModel(m)}
                                            >
                                                {downloadingId === m.id
                                                    ? <CircularProgress size={20} />
                                                    : <DownloadIcon />}
                                            </IconButton>
                                        }
                                    >
                                        <ListItemButton onClick={() => downloadModel(m)} sx={{ pr: 7 }}>
                                            <ListItemText
                                                primary={m.name}
                                                secondary={<Chip label={m.size} size="small" />}
                                                secondaryTypographyProps={{ component: 'div' }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    </>
                )}
            </DialogContent>

            {/* ── Auth sub-dialog ── */}
            {openAuthDialog && (
                <Dialog fullScreen={true} open={openAuthDialog}>
                    <DialogTitle id="tone3000-auth-dialog-title">
                        <Toolbar style={{ padding: 0 }}>
                            <IconButtonEx
                                tooltip="Close"
                                edge="start"
                                color="inherit"
                                aria-label="cancel"
                                style={{ opacity: 0.6 }}
                                onClick={() => { onClose(); }}
                            >
                                <ArrowBackIcon style={{ width: 24, height: 24 }} />
                            </IconButtonEx>
                            <Typography noWrap component="div" sx={{ flexGrow: 1 }}>
                                TONE3000 Authorization
                            </Typography>
                        </Toolbar>
                    </DialogTitle>
                    <DialogContent>
                        <div style={{ display: "flex", flexFlow: "row nowrap", alignItems: "start" }}>
                            <div style={{ flex: "1 1 1px" }} />
                            <div style={{
                                maxWidth: 500, marginLeft: "auto", marginRight: "auto",
                                display: "flex", flexFlow: "column nowrap", gap: 16, alignItems: "start",
                            }}>
                                <Typography variant="body1" component="div" display="block">
                                    The <Link href="https://www.tone3000.com" target="_blank">TONE3000 website</Link> provides an
                                    online library of models for use with TooB Neural Amp Modeller. You can download
                                    models from the TONE3000 website onto your local machine and then upload them to
                                    PiPedal; or, more conveniently, you can browse the TONE3000 model database directly, and download models directly
                                    to the PiPedal server from the TONE3000 model database in a single step.
                                </Typography>
                                <Typography variant="body1" component="div" display="block">
                                    In order to access the TONE3000 database, you must first obtain an access token from the
                                    TONE3000 website. Clicking on the button will take you to an external website in
                                    order to complete the authorization process.
                                </Typography>
                                <Button variant="contained" color="primary" style={{ alignSelf: "end", marginRight: 32 }}
                                    onClick={() => {
                                        window.open(AuthUrl(), "_blank");
                                    }}
                                >
                                    Continue to TONE3000
                                </Button>
                                <Typography variant="body2" component="div" display="block" style={{ marginTop: 32 }}>
                                    Privacy statement: PiPedal will only have access to your authorization token
                                    which does not contain personally identifying information, and which is stored locally on
                                    your PiPedal server. Please refer to
                                    the <Link href="https://www.tone3000.com/privacy" target="_blank">TONE3000 privacy policy</Link> for
                                    information on how your data is used by TONE3000.
                                </Typography>
                            </div>
                            <div style={{ flex: "2 2 1px" }} />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </DialogEx>
    );
}

export default Tone3000Dialog;
