import React, { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import {
  makeStyles,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  TextField,
  TablePagination,
} from "@material-ui/core";

import {
  Search,
  DeleteOutline,
  Edit,
  AddCircleOutline,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const Roles = () => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [count, setCount] = useState(0);
  const [roles, setRoles] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/roles", {
          params: { searchParam, pageNumber, limit: rowsPerPage },
        });
        
        // Suporte a diferentes formatos de resposta
        if (Array.isArray(data)) {
            setRoles(data);
            setCount(data.length);
        } else {
            setRoles(data.roles || []);
            setCount(data.count || 0);
        }
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, [searchParam, pageNumber, rowsPerPage]);

  const handleSearch = (event) => {
    setSearchParam(event.target.value);
    setPageNumber(1);
  };

  const handleEditRole = (roleId) => {
    history.push(`/roles/${roleId}`);
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await api.delete(`/roles/${roleId}`);
      toast.success(i18n.t("role.toasts.deleted"));
      setRoles(roles.filter((role) => role.id !== roleId));
    } catch (err) {
      toastError(err);
    }
    setDeletingRole(null);
    setConfirmModalOpen(false);
  };

  const handleChangePage = (event, newPage) => {
    setPageNumber(newPage + 1);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPageNumber(1);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={deletingRole && `${i18n.t("role.confirmationModal.deleteTitle")} ${deletingRole.name}?`}
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteRole(deletingRole.id)}
      >
        {i18n.t("role.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <MainHeader>
        <Title>{i18n.t("role.title") || "Papéis"}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="secondary" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleEditRole("new")}
          >
            <AddCircleOutline />
            <span style={{ marginLeft: 8 }}>{i18n.t("role.buttons.add") || "Adicionar Papel"}</span>
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("role.table.name") || "Nome"}</TableCell>
              <TableCell align="center">{i18n.t("role.table.description") || "Descrição"}</TableCell>
              <TableCell align="center">{i18n.t("role.table.actions") || "Ações"}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell align="center">{role.name}</TableCell>
                  <TableCell align="center">{role.description}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditRole(role.id)}
                    >
                      <Edit color="secondary" />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingRole(role);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutline color="secondary" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={3} />}
            </>
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={count}
          rowsPerPage={rowsPerPage}
          page={pageNumber - 1}
          onChangePage={handleChangePage}
          onChangeRowsPerPage={handleChangeRowsPerPage}
          labelRowsPerPage={i18n.t("common.rowsPerPage") || "Linhas por página"}
        />
      </Paper>
    </MainContainer>
  );
};

export default Roles;
