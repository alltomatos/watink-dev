import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo,
    HasMany,
    DataType,
    Default,
} from "sequelize-typescript";
import Tenant from "./Tenant";
import ActivityTemplateItem from "./ActivityTemplateItem";

@Table({ tableName: "ActivityTemplates" })
class ActivityTemplate extends Model<ActivityTemplate> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Tenant)
    @Column(DataType.UUID)
    tenantId: string;

    @BelongsTo(() => Tenant)
    tenant: Tenant;

    @Column(DataType.STRING(255))
    name: string;

    @Column(DataType.TEXT)
    description: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive: boolean;

    @HasMany(() => ActivityTemplateItem)
    items: ActivityTemplateItem[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default ActivityTemplate;
