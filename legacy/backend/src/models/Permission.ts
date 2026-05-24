import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    BelongsToMany
} from "sequelize-typescript";
import Group from "./Group";
import GroupPermission from "./GroupPermission";
import User from "./User";
import UserPermission from "./UserPermission";

@Table
class Permission extends Model<Permission> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column(DataType.STRING)
    resource: string;

    @Column(DataType.STRING)
    action: string;

    @Column(DataType.VIRTUAL)
    get name(): string {
        return `${this.resource}:${this.action}`;
    }

    @Column(DataType.STRING)
    description: string;

    @BelongsToMany(() => Group, () => GroupPermission)
    groups: Group[];

    @BelongsToMany(() => User, () => UserPermission)
    users: User[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default Permission;
