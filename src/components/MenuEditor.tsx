
import { useState } from 'react'; 
import { PanelMenu } from 'primereact/panelmenu';
import { Button } from 'primereact/button';

export default function EditorMenu() {
    const items = [
        {
            key: '0',
            label: 'Cadastros',
            icon: 'pi pi-users',
            items: [
                {
                    key: '0_1',
                    icon: 'pi pi-plus',
                    label: 'Novo',
                    items: [
                        {
                            key: '0_1_0',
                            icon:'pi pi-user',
                            label: 'Aluno',
                        },
                        {
                            key: '0_1_1',
                            icon: 'pi pi-tags',
                            label: 'Modalidade',
                        }
                    ]
                },
                {
                    key: '0_2',
                    label: 'Editar',
                    icon: 'pi pi-pencil'
                },
                {
                    key: '0_3',
                    label: 'Status',
                    icon: 'pi pi-info'

                }
            ]
        },
        {
            key: '1',
            label: 'Utilidades',
            icon: 'pi pi-server',
            items: [
                {
                    key: '1_0',
                    icon: 'pi pi-print',
                    label: 'Imprimir',
                },
                {
                    key: '1_1',
                    icon: 'pi pi-book',
                    label: 'Relatorios',
                },
                {
                    key: '1_2',
                    icon:'pi pi-money-bill',
                    label: 'Pagamentos',
                }
            ]
        },
        {
            key: '2',
            label: 'Agenda',
            icon: 'pi pi-calendar',
            items: [
                {
                    key: '2_0',
                    icon: 'pi pi-sync',
                    label: 'Reagendar',
                },
                {
                    key: '2_1',
                    icon:'pi pi-clock',
                    label: 'Horarios',
                },
                {
                    key: '2_2',
                    icon:'pi pi-calendar-clock',
                    label: 'Semanal',
                }
            ]
        }
    ];

    const [expandedKeys, setExpandedKeys] = useState<any>({});

    const toggleAll = () => {
        if (Object.keys(expandedKeys).length) {
            collapseAll();
        } else {
            expandAll();
        }
    };

    const expandAll = () => {
        items.forEach(expandNode);
        setExpandedKeys({ ...expandedKeys });
    };

    const collapseAll = () => {
        setExpandedKeys({});
    };

    const expandNode = (node) => {
        if (node.items && node.items.length) {
            expandedKeys[node.key] = true;

            node.items.forEach(expandNode);
        }
    };

    return (
        <div className="card flex flex-column align-items-center gap-3">
            <Button type="button" label="Toggle All" text onClick={() => toggleAll()} />
            <PanelMenu model={items} expandedKeys={expandedKeys} onExpandedKeysChange={setExpandedKeys} className="w-full md:w-20rem" multiple />
            </div>
    )
}
        