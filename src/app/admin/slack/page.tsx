'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSlackQueries, useSlackMutations } from "@/hooks/api/admin/slack.api";
import {
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Card,
  Tag,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader/PageHeader';

type SlackMessage = {
  id?: string;
  message: string;
  variables: { key: string }[];
  category: string;
  attachments: Record<string, any>;
  isActive: boolean;// Shown as {{firstName}}, etc.
};

type VariableDragItem = {
  type: 'variable';
  key: string;
};

const VARIABLE_TYPE = 'variable';

/**
 * Convert from the backend format: ${req.user.firstName} --> display format: {{firstName}}
 * This looks for any pattern like ${SOMETHING} and replaces it with {{lastPartOfPath}}
 */
function fromBackendToView(text: string): string {
  return text.replace(/\$\{([a-zA-Z0-9_.]+)\}/g, (_, path) => {
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1] || path;
    return `{{${lastPart}}}`;
  });
}

/**
 * Convert from the display format: {{firstName}} --> backend format: ${req.user.firstName}
 * For everything, we assume the prefix is "req.user" (adjust if needed).
 */
function fromViewToBackend(text: string): string {
  return text.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, varName) => {
    return `\${req.user.${varName}}`;
  });
}

/** 
 * Extract last-part variable names from a message that uses either backend style (${...}) or view style ({{...}}).
 */
function extractVariablesFromMessage(msg: string): string[] {
  // Matches either ${something} or {{something}}
  const pattern = /\$\{([a-zA-Z0-9_.]+)\}|\{\{([a-zA-Z0-9_.]+)\}\}/g;
  const found = new Set<string>();
  let match;
  while ((match = pattern.exec(msg)) !== null) {
    // match[1] => from ${...}, match[2] => from {{...}}
    const content = match[1] || match[2];
    const lastPart = content.split('.').pop();
    if (lastPart) found.add(lastPart);
  }
  return Array.from(found);
}

/**
 * Draggable tag for a variable, to be dropped into the editor text area.
 */
function DraggableVariable({
  variable,
  highlight,
  onDrop,
}: {
  variable: { key: string };
  highlight?: boolean;
  onDrop?: (v: { key: string }) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: VARIABLE_TYPE,
    item: variable,
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: VARIABLE_TYPE,
    drop: (item: VariableDragItem) => {
      if (onDrop) onDrop(item);
    },
  });

  return (
    <Tag
      ref={node => {
        drag(drop(node));
      }}
      color={highlight ? 'gold' : 'blue'}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        border: highlight ? '2px solid orange' : undefined,
        fontWeight: highlight ? 600 : undefined,
        background: highlight ? '#fffbe6' : undefined,
        minWidth: 80,
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {variable.key}
    </Tag>
  );
}

/**
 * Text editor that displays variables as {{firstName}}; on drop or button click,
 * a variable is inserted.
 */
function MessageEditor({
  value,
  onChange,
  variables,
  highlightedVar,
  setHighlightedVar,
  onDropVar,
}: {
  value: string;
  onChange: (val: string) => void;
  variables: { key: string }[];
  highlightedVar?: string;
  setHighlightedVar?: (v: string | undefined) => void;
  onDropVar?: (key: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert a variable at the cursor position, using {{key}}
  const insertVariable = (key: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const variableStr = `{{${key}}}`;
    const newVal = before + variableStr + after;
    onChange(newVal);

    // Re-focus the cursor after insertion
    setTimeout(() => {
      textarea.setSelectionRange(start + variableStr.length, start + variableStr.length);
      textarea.focus();
    }, 0);
  };

  // Drop target for variables
  const [, drop] = useDrop({
    accept: VARIABLE_TYPE,
    drop: (item: VariableDragItem) => {
      if (onDropVar) onDropVar(item.key);
      else insertVariable(item.key);
    },
  });

  // Split text for highlighting. We only highlight {{someVar}}
  const getHighlightedText = () => {
    const regex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
    const parts: (string | { key: string })[] = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push(value.substring(lastIndex, match.index));
      }
      const varName = match[1].split('.').pop() || match[1];
      parts.push({ key: varName });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < value?.length) {
      parts.push(value.substring(lastIndex));
    }
    return parts;
  };

  return (
    <div
      ref={(node) => {
        if (node) drop(node);
      }}
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        padding: 4,
        minHeight: 120,
        background: '#fcfcfc',
      }}
    >
      <div style={{ marginBottom: 4, fontWeight: 50 }}>Message</div>
      <textarea
        ref={textareaRef}
        rows={4}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          resize: 'vertical',
          fontFamily: 'inherit',
          fontSize: 15,
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setHighlightedVar?.(undefined)}
      />
      <div style={{ marginTop: 6, fontSize: 13 }}>
        {getHighlightedText().map((part, i) =>
          typeof part === 'string' ? (
            <span key={i}>{part}</span>
          ) : (
            <span
              key={i}
              style={{
                background: highlightedVar === part.key ? '#ffe58f' : '#e6f7ff',
                borderRadius: 4,
                padding: '0 4px',
                margin: '0 1px',
                fontWeight: 600,
                cursor: 'pointer',
                border: highlightedVar === part.key ? '1px solid orange' : undefined,
                minWidth: 80,
                textAlign: 'center',
                display: 'inline-block',
              }}
              onMouseEnter={() => setHighlightedVar?.(part.key)}
              onMouseLeave={() => setHighlightedVar?.(undefined)}
            >
              {'{{'}
              {part.key}
              {'}}'}
            </span>
          ),
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        <strong>Drag a variable to insert:</strong>
        <Space wrap>
          {variables.map(v => (
            <DraggableVariable
              key={v.key}
              variable={v}
              highlight={highlightedVar === v.key}
              onDrop={() => insertVariable(v.key)}
            />
          ))}
        </Space>
      </div>
    </div>
  );
}

/**
 * Main Slack Messages CRUD
 */
export default function SlackMessagesCRUD() {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState<SlackMessage | null>(null);

  
  // const [newCategory, setNewCategory] = useState('');

  const [form] = Form.useForm();

  // Filters/search
  const [filterCat, setFilterCat] = useState<string | undefined>();
  const [searchMsg, setSearchMsg] = useState('');

  // For highlighting variables in message editor
  const [highlightedVar, setHighlightedVar] = useState<string | undefined>();

  // Load messages using proper API hook
  const { slackMessagesDomain } = useSlackQueries();
  const { slackDomain } = useSlackMutations();

  // Process messages when data loads
  useEffect(() => {
    // Add fallback categories if empty + ensure categories are collected
    const foundCats = new Set<string>(["system", "alert", "notification"]);

    if (slackMessagesDomain.data && slackMessagesDomain.data.length > 0) {
      // Transform each message from backend to view format
      const processed = slackMessagesDomain.data.map((msg: any) => {
        // Convert from ${req.user.firstName} --> {{firstName}} for viewing
        const viewFormat = fromBackendToView(msg.message);

        // Extract variables from the transformed view string
        const variables = extractVariablesFromMessage(viewFormat).map(key => ({ key }));

        if (msg.category) {
          foundCats.add(msg.category);
        }

        return {
          id: msg._id || msg.id,  
          message: msg.message,
          category: msg.category || "system",
          attachments: msg.attachments || {},
          isActive: msg.isActive ?? true,
          variables: variables,
        } as SlackMessage;
      });

      setMessages(processed);
    }
    
    // Always set categories even when no messages
    setCategories(prev => {
      const newCats = Array.from(foundCats);
      if (JSON.stringify(prev) !== JSON.stringify(newCats)) {
        return newCats;
      }
      return prev;
    });
  }, [slackMessagesDomain.data]);

  // Handle loading errors
  useEffect(() => {
    if (slackMessagesDomain.isError) {
      toast.error('Error loading messages');
    }
  }, [slackMessagesDomain.isError]);

  // Drawer open for add/edit
  const openDrawer = (msg?: SlackMessage) => {
    if (msg) {
      setEditingMsg(msg);

      // Convert the existing `msg.message` (which is in backend format) to the view format
      const viewFormat = fromBackendToView(msg.message);

      form.setFieldsValue({
        message: viewFormat,
        category: msg.category,
      });
    } else {
      setEditingMsg(null);
      form.resetFields();
      form.setFieldsValue({
        category: categories[0],
      });
    }
    setIsDrawerOpen(true);
  };

  // Save to backend using API hooks
  const handleDrawerSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Convert from {{firstName}} back to ${req.user.firstName} or whichever prefix
      const rawBackendFormat = fromViewToBackend(values.message);

      // Re-extract variables from the view text
      const extractedVars = extractVariablesFromMessage(values.message).map((k) => ({ key: k }));

      const newData: SlackMessage = { 
        id: editingMsg?.id,
        message: rawBackendFormat, // store the final, backend-friendly version
        category: values.category,
        attachments: {},
        isActive: true,
        variables: extractedVars,   
      };
 

      if (editingMsg && editingMsg.id) { 
        // Update existing message
        await slackDomain.updateSlackMessage.mutateAsync({
          id: editingMsg.id,
          values: newData
        });
        
        toast.success('Message updated successfully');
      setMessages((prev) =>
          prev.map((m) => (m.id === editingMsg.id ? { ...newData, id: m.id } : m))
        );

      } else {
        // Create new message
        await slackDomain.createSlackMessage.mutateAsync(newData);
      setMessages((prev) => [{ ...newData, id: Date.now().toString() }, ...prev]);
        toast.success('Message created successfully');
      }

      form.resetFields();
      setIsDrawerOpen(false);
      setEditingMsg(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save message');
    }
  };

  // --- Filtering and searching logic ---
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      const backendMsg = msg.message || '';
      // We can compare search either in the raw text or the front-end text
      const viewFmt = fromBackendToView(backendMsg).toLowerCase();
      return (
        (!filterCat || msg.category === filterCat) &&
        (!searchMsg ||
          viewFmt.includes(searchMsg.toLowerCase()) ||
          msg.variables?.some((v) => v.key.toLowerCase().includes(searchMsg.toLowerCase())))
      );
    });
  }, [messages, filterCat, searchMsg]);

  // --- Highlighting variables in the Card view ---
  // For the card, we show the message as if it were in "view" format
  function highlightVarsInMsg(msg: string) {
    // Convert from the stored (backend) format to the display format
    const viewString = fromBackendToView(msg);

    // Then highlight the pieces like {{...}}
    const regex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
    const parts: (string | { key: string })[] = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(viewString)) !== null) {
      if (match.index > lastIndex) parts.push(viewString.substring(lastIndex, match.index));
      const last = match[1].split('.').pop() || match[1];
      parts.push({ key: last });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < viewString.length) parts.push(viewString.substring(lastIndex));

    return parts.map((part, i) =>
      typeof part === 'string' ? (
        <span key={i}>{part}</span>
      ) : (
        <span
          key={i}
          style={{
            background: '#ffe58f',
            borderRadius: 4,
            padding: '0 4px',
            margin: '0 1px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid orange',
            minWidth: 80,
            textAlign: 'center',
            display: 'inline-block',
          }}
          title={part.key}
        >
          {'{{'}
          {part.key}
          {'}}'}
        </span>
      )
    );
  }

  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Slack Message Manager" />
      <DndProvider backend={HTML5Backend}>
        <div className="max-w-[1280px] mx-auto px-4 py-8">

          <Space className="mb-6">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              Add Message
            </Button>
    
            <Select
              allowClear
              className="w-[220px]"
              placeholder="Filter by Category"
              value={filterCat}
              onChange={setFilterCat}
              options={categories.map((cat) => ({ label: cat, value: cat }))}
            />
            <Input
              className="w-[220px]"
              prefix={<SearchOutlined />}
              placeholder="Search message or variable"
              value={searchMsg}
              onChange={(e) => setSearchMsg(e.target.value)}
              allowClear
            />
          </Space>

          <Row gutter={[16, 16]} className="mb-8">
            {filteredMessages.map((msg) => (
              <Col xs={24} sm={12} md={10} lg={8} key={msg.id}>
                <Card
                  title={
                    // Truncate the displayed text if it's long
                    highlightVarsInMsg(
                      fromBackendToView(msg.message).length > 60
                        ? fromBackendToView(msg.message).slice(0, 60) + '...'
                        : fromBackendToView(msg.message)
                    )
                  }
                  actions={[<EditOutlined key="edit" onClick={() => openDrawer(msg)} />]}
                    className="min-h-[270px] rounded-[10px] mb-4 border border-career-blue-300 transition-all duration-300 ease-in-out hover:bg-career-blue-100 hover:cursor-pointer"

                >
                  <p>
                    <strong>SMID:</strong> {msg.id || <i>None</i>}
                    <br />
                    <strong>Category:</strong> {msg.category || <i>None</i>}
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <strong>Variables:</strong>
                    <Space wrap>
                      {msg.variables.map((v) => (
                        <DraggableVariable
                          key={`${msg.id}-${v.key}`}
                          variable={v}
                          highlight={highlightedVar === v.key}
                        />
                      ))}
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Drawer for Add/Edit */}
          {isDrawerOpen && (
          <Drawer
            title={editingMsg ? 'Edit Message' : 'New Message'}
            open={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              form.resetFields();
              setEditingMsg(null);
              setHighlightedVar(undefined);
            }}
            size="large"
          >
            <Form form={form} layout="vertical">
              <Form.Item
                label="Message (view shows {{var}}, but saved as ${req.user.var})"
                name="message"
                rules={[{ required: true, message: 'Please enter a message' }]}
              >
                <MessageEditor
                  value={form.getFieldValue('message') || ''}
                  onChange={(val) => form.setFieldsValue({ message: val })}
                  variables={extractVariablesFromMessage(form.getFieldValue('message') || '').map((k) => ({ key: k }))}
                  highlightedVar={highlightedVar}
                  setHighlightedVar={setHighlightedVar}
                />
              </Form.Item>
              <Form.Item
                label="Category"
                name="category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {categories.map((cat) => (
                    <Select.Option key={cat} value={cat}>
                      {cat}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <div style={{ textAlign: 'right' }}>
                <Button onClick={() => setIsDrawerOpen(false)} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleDrawerSubmit}
                  loading={slackDomain.createSlackMessage.isPending || slackDomain.updateSlackMessage.isPending}
                  disabled={slackDomain.createSlackMessage.isPending || slackDomain.updateSlackMessage.isPending}
                >
                  {editingMsg ? 'Update' : 'Create'}
                </Button>
              </div>
            </Form>
          </Drawer>
          )}
        </div>
      </DndProvider>
    </section>
  );
}